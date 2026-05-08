import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { syncData, pullData } from '../lib/syncManager';
import { useTranslation } from '../contexts/TranslationContext';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the session after redirecting back from Supabase Auth
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        toast.error(error.message);
        navigate('/login');
        return;
      }

      if (session?.user) {
        toast.success(t('welcomeBack'));
        try {
          // Perform data synchronization for the newly authenticated OAuth user
          await syncData(session.user.id);
          await pullData(session.user.id);
        } catch (syncError) {
          console.error("Post-OAuth sync failed:", syncError);
        }
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, t]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center animate-pulse">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-slate-600 dark:text-slate-400 tracking-tight">Finalizing authentication...</p>
      </div>
    </div>
  );
}