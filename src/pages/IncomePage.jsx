import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { useNumberFormatter } from 'react-aria';
import { db } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient'; // Import supabase client
import { Trash2, PlusCircle, Filter, Download, ArrowRight, Wallet, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IncomePage() {
  const { t, profile, formatDate } = useTranslation();
  const { user } = useAuth();
  const { register, handleSubmit, reset } = useForm();

  const formatter = useNumberFormatter({
    style: 'currency',
    currency: profile?.currency === 'FCAF' ? 'XAF' : profile?.currency || 'USD',
    currencyDisplay: 'symbol'
  });

  // Reactive data fetching
  const incomes = useLiveQuery(() => 
    db.incomes.where('user_id').equals(user?.id || '').filter(item => !item._deleted).toArray()
  , [user]);

  const totalMonthly = incomes?.reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;
  const incomeGoal = 5000; // Placeholder target, could be connected to goals
  const progress = Math.min((totalMonthly / incomeGoal) * 100, 100);

  const onSubmit = async (data) => {
    try {
      const category = data.category || 'General';
      const isEmailEnabled = profile?.email_inflow ?? true; // Default to true

      await db.incomes.add({
        id: crypto.randomUUID(),
        user_id: user.id,
        amount: parseFloat(data.amount),
        category: category,
        date: new Date().toISOString(),
        synced_at: null
      });
      
      if (isEmailEnabled && user?.email) {
        const { error: invokeError } = await supabase.functions.invoke('RESEND_API_KEY', {
          body: {
            type: 'income_added',
            recipientEmail: user.email,
            payload: { 
              amount: data.amount, 
              category: category, 
              date: new Date().toISOString(), 
              currency: profile?.currency || 'USD' 
            }
          }
        });

        if (invokeError) {
          console.error("Notification trigger failed:", invokeError);
          toast.success(t('incomeRecorded')); // Record anyway but notify log
        } else {
          toast.success(`${t('incomeRecorded')} — Confirmation sent to ${user.email}`);
        }
      } else {
        toast.success(t('incomeRecorded'));
      }
      reset();
    } catch (err) {
      toast.error('Failed to add income');
    }
  };

  const handleDelete = async (id) => {
    try {
      const originalItem = await db.incomes.get(id);
      await db.incomes.update(id, { _deleted: true, synced_at: null });
      
      toast((tToast) => (
        <div className="flex items-center justify-between gap-4 min-w-[220px]">
          <span className="text-sm font-medium">{t('deleteSuccess')}</span>
          <button 
            onClick={async () => {
              await db.incomes.update(id, { _deleted: false, synced_at: originalItem.synced_at });
              toast.dismiss(tToast.id);
              toast.success(t('restored'));
            }}
            className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter hover:bg-black transition-colors"
          >
            {t('undo')}
          </button>
        </div>
      ), { duration: 5000 });
    } catch (err) {
      toast.error('Failed to delete income');
    }
  };

  // Sort incomes by date descending so new entries appear on top
  const recentIncomes = useMemo(() => {
    return [...(incomes || [])]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [incomes]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-screen-2xl mx-auto space-y-12">
      {/* Editorial Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold tracking-[0.2em] text-[10px] uppercase mb-2">
            {t('financialFlow') || 'Financial Flow'}
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white font-headline">
            {t('incomeManagement')}
          </h1>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500 dark:border-emerald-400 flex flex-col items-end min-w-[200px] border border-slate-200 dark:border-slate-700">
          <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t('monthlyTotal')}</span>
          <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-headline">
            +{formatter.format(totalMonthly)}
          </span>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Insight */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 font-headline">
                <PlusCircle className="text-emerald-500" size={20} />
                {t('recordNew')}
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">{t('category')}</label>
                  <select 
                    {...register('category')}
                    className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-body"
                  >
                    <option value="">{t('category')}</option>
                    <option value="Employment">{t('Salary') || 'Salary'}</option>
                    <option value="Freelance">{t('Freelance') || 'Freelance'}</option>
                    <option value="Investment">{t('Investment') || 'Investment'}</option>
                    <option value="Gift">{t('Gift') || 'Gift'}</option>
                    <option value="Other">{t('Other') || 'Other'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">{t('amount')}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      {profile?.currency === 'XAF' ? 'FCFA' : profile?.currency || '$'}
                    </span>
                    <input 
                      {...register('amount', { required: true })}
                      className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl p-4 pl-16 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-body text-lg" 
                      placeholder="0.00" 
                      type="number" 
                      step="0.01" 
                    />
                  </div>
                </div>
                <button className="w-full bg-emerald-600 text-white py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200 dark:shadow-none" type="submit">
                  <TrendingUp size={20} />
                  {t('add')}
                </button>
              </form>
            </div>
          </section>

          <div className="bg-indigo-600 dark:bg-indigo-700 p-8 rounded-2xl text-white relative overflow-hidden shadow-xl shadow-indigo-200 dark:shadow-none">
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Insight</span>
              <h3 className="text-xl font-bold mb-4 font-headline leading-tight">
                You've reached {progress.toFixed(0)}% of your income goal this month.
              </h3>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: History Table */}
        <div className="lg:col-span-8">
          <section className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-full">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-headline">{t('transactionHistory')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">{t('date')}</th>
                    <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">{t('category')}</th>
                    <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 text-right">{t('amount')}</th>
                    <th className="pb-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {recentIncomes.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {formatDate(item.date)}
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">+{formatter.format(item.amount)}</span>
                      </td>
                      <td className="py-5 px-4 text-right">
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700 text-center">
              <Link to="/transactions" className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline flex items-center justify-center gap-1">
                {t('viewFullStatement') || 'View Full Statement'} <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}