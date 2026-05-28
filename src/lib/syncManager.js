import { db } from './db';
import { supabase } from './supabaseClient';

export const pullData = async (userId) => {
  if (!navigator.onLine || !userId) return;

  const tables = ['profiles', 'incomes', 'expenses', 'goals'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(
          table === 'profiles' ? 'id' : 'user_id', // Profiles table uses 'id' as user ID
          userId
        );

      if (error) throw error;
      if (data) {
        // Identify items that have unsynced local changes (including deletions)
        const localPending = await db[table].filter(item => !item.synced_at).toArray();
        const pendingIds = new Set(localPending.map(i => i.id));
        
        // Only update local records that are already in sync with the server
        const toUpdate = data.filter(remoteItem => !pendingIds.has(remoteItem.id));
        await db[table].bulkPut(toUpdate);
      }
    } catch (err) {
      console.error(`[Sync] Failed to pull ${table}:`, err);
    }
  }
};

export const syncData = async (userId) => {
  if (!navigator.onLine || !userId) {
    console.log("[Sync] Offline or no user ID. Skipping sync.");
    return;
  }

  // Phase 1: Ensure Profile exists on Server
  // We handle profiles separately and first to satisfy foreign key constraints (Error 23503)
  try {
    // Get the profile for this user ID, or the first available local profile if ID is inconsistent
    const localProfile = await db.profiles.get(userId) || (await db.profiles.toArray())[0];
    
    const profileToSync = localProfile || { 
      full_name: '', 
      language: 'en-US', 
      currency: 'USD', 
      theme: 'light'
    };

    // Clean up profile payload for Supabase
    const { synced_at, _deleted, ...profilePayload } = profileToSync;
    profilePayload.id = userId; // Force the ID to the current authenticated user

    console.log("[Sync] Verifying profile existence on server...");
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select();

    console.log("[Sync] Supabase profile upsert result:", { profileData, profileError });

    // CRITICAL: If profile upsert fails or returns no data (often due to RLS blocking SELECT), ABORT.
    // This prevents cascading foreign key errors.
    if (profileError || !profileData || profileData.length === 0) {
      console.error("[Sync] ABORTING: Profile record could not be established/verified on Supabase. Check RLS policies for 'profiles' table (INSERT, SELECT) and Supabase logs.", profileError);
      return; // Stop here. Do not attempt to sync incomes, expenses, or goals.
    }

    // Update local DB to reflect synced status and correct ID
    const now = new Date().toISOString();
    // If the local profile had a temporary ID (not the actual auth.uid()), delete it and put the new one.
    if (localProfile && localProfile.id !== userId && localProfile.id.length > 30) { // Heuristic for temporary UUID
      await db.profiles.delete(localProfile.id);
    }
    await db.profiles.put({ ...profilePayload, synced_at: now });
    
    console.log("[Sync] Profile established. Proceeding to dependent tables.");
  } catch (err) {
    console.error("[Sync] Critical failure during profile verification:", err);
    return;
  }

  // Phase 2: Sync Dependent Tables
  const tables = ['incomes', 'expenses', 'goals'];

  for (const table of tables) {
    try {
      // Find records that haven't been synced yet (includes new, modified, and deleted)
      let itemsToProcess = await db[table].filter(item => !item.synced_at && !item._deleted).toArray();
      const deletedItems = await db[table].filter(item => item._deleted).toArray();
      itemsToProcess = [...itemsToProcess, ...deletedItems];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // Filter only items belonging to the current user with valid UUIDs
      const userItems = itemsToProcess.filter(item => {
        const belongsToUser = item.user_id === userId;
        return belongsToUser && uuidRegex.test(item.id);
      });

      if (userItems.length === 0) continue;

      // 1. Handle Deletions: Push removals to Supabase first
      const itemsToDelete = userItems.filter(item => item._deleted);
      for (const item of itemsToDelete) {
        const { error: delError } = await supabase.from(table).delete().eq('id', item.id);
        if (!delError) {
          await db[table].delete(item.id); // Hard delete locally once cloud is confirmed
        } else {
          console.error(`[Sync] Delete failed for ${table}/${item.id}:`, delError);
        }
      }

      // 2. Handle Upserts: Push new/modified records
      const itemsToUpsert = userItems.filter(item => !item._deleted);
      if (itemsToUpsert.length === 0) continue;

       const upsertPayload = itemsToUpsert.map(({ synced_at, _deleted, ...item }) => {
        const record = { ...item };
        record.user_id = userId;
        return record;
      });

      const { data: supabaseData, error: supabaseError } = await supabase
        .from(table)
        .upsert(upsertPayload, { onConflict: 'id' })
        .select();

      if (supabaseError) {
        console.error(`[Sync] Supabase Error (${supabaseError.code}) for ${table}:`, {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          payload: upsertPayload
        });
      }

      if (supabaseError) {
        // If we hit a foreign key error (23503), the Phase 1 establishment failed. 
        if (supabaseError.code === '23503') {
          console.error(`[Sync] Foreign Key violation on ${table}. Aborting cycle.`);
          return;
        }
        continue; 
      }

      // Only update local DB if there was no error and we have confirmation data
      if (!supabaseError && supabaseData && supabaseData.length > 0) {
        // Mark as synced in local DB
        const now = new Date().toISOString();
        const updatePromises = itemsToUpsert.map(item => 
          db[table].update(item.id, { synced_at: now })
        );
        await Promise.all(updatePromises);
        console.log(`Synced ${supabaseData.length} items to Supabase for ${table}`);
      }
    } catch (err) {
      console.error(`[Sync] Critical failure for ${table}:`, err);
    }
  }
};
