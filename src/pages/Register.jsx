import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { User, Mail, Lock, ShieldPlus, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setLoading(true);
    const { error } = await signUp(data);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check your email for confirmation!');
      navigate('/login');
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/api/auth/callback/google`,
      },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-500">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-indigo-900/5 border border-slate-100 dark:border-slate-800 p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-emerald-500"></div>
        
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <ShieldPlus size={24} />
            </div>
            <span className="text-xl font-black text-indigo-900 dark:text-white tracking-tighter">Personal Saving Tracker</span>
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter mb-2 font-headline">{t('createAccount')}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t('startJourney')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('firstName')}</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  {...register('firstName', { required: true })} 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-5 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('lastName')}</label>
              <input 
                {...register('lastName', { required: true })} 
                type="text" 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('email')}</label>
            <input 
              {...register('email', { required: true })} 
              type="email" 
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" 
            />
          </div>
           <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('location')}</label>
            <input 
              {...register('location', { required: true })} 
              type="text" 
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('phoneNumber')}</label>
            <input 
              {...register('phoneNumber', { required: true })} 
              type="tel" 
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('password')}</label>
            <div className="relative">
              <input 
                {...register('password', { required: true, minLength: 6 })} 
                type={showPassword ? "text" : "password"} 
                className={`w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-5 pr-12 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none ${errors.password ? 'ring-2 ring-rose-500/50' : ''}`} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password?.type === 'minLength' && (
              <p className="text-rose-500 text-[10px] font-bold uppercase ml-1 mt-1">{t('passwordTooShort')}</p>
            )}
          </div>
          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group mt-4"
          >
            {loading ? t('creating') : (
              <>
                {t('createFreeAccount')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('orContinueWith')}</span>
          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          className="w-full mt-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t('googleSignIn')}
        </button>

        <p className="text-center mt-6 text-sm text-slate-600">
          {t('alreadyHaveAccount')} <Link to="/login" className="text-blue-600 font-bold hover:underline">{t('logIn')}</Link>
        </p>
      </div>
    </div>
  );
}