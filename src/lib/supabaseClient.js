import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add checks to ensure environment variables are loaded
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not defined. Please check your .env file and Vite configuration.');
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not defined. Please check your .env file and Vite configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);