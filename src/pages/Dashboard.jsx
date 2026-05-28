import React, { useMemo, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  Wallet, 
  Receipt, 
  Plus, 
  Calendar, 
  MoreHorizontal,
  ShoppingBag, 
  Briefcase,
  Download,
  Sparkles,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // Import supabase client
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { t, profile, formatDate, deferredPrompt, setDeferredPrompt } = useTranslation();
  const { user } = useAuth();
  const [investmentIdeas, setInvestmentIdeas] = useState([]);

  // Fetch data from Dexie
  const incomes = useLiveQuery(() => db.incomes.where('user_id').equals(user?.id || '').filter(item => !item._deleted).toArray(), [user]);
  const expenses = useLiveQuery(() => db.expenses.where('user_id').equals(user?.id || '').filter(item => !item._deleted).toArray(), [user]);
  const goals = useLiveQuery(() => db.goals.where('user_id').equals(user?.id || '').filter(item => !item._deleted).toArray(), [user]);
  
  // Calculate Totals
  const totalIncome = incomes?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const totalExpense = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const netWorth = totalIncome - totalExpense;

  // Combine and sort recent activity
  const recentActivity = [
    ...(incomes || []).map(i => ({ ...i, type: 'income' })),
    ...(expenses || []).map(e => ({ ...e, type: 'expense' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

  // Project Information Calculations
  // Memoize 'now' to prevent unnecessary re-runs of all dependent hooks/effects
  const now = useMemo(() => new Date(), []);
  
  // Monthly Flow Data (Last 6 Months)
  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const value = incomes
        ?.filter(inc => {
          const incDate = new Date(inc.date);
          return incDate.getMonth() === d.getMonth() && incDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, inc) => sum + inc.amount, 0) || 0;
      data.push({ label, value });
    }
    return data;
  }, [incomes, now]);

  const maxIncome = Math.max(...monthlyData.map(d => d.value), 0) || 1;
  const avgMonthlyIncome = monthlyData.reduce((acc, curr) => acc + curr.value, 0) / 6;
  const bestMonthAmount = Math.max(...monthlyData.map(d => d.value), 0);
  // Lifestyle Insight Calculation
  const topCategory = useMemo(() => {
    const totals = expenses?.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {}) || {};
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
  }, [expenses]);

  const lifestyleInsight = topCategory === 'General' 
    ? "Categorize your expenses to unlock personalized lifestyle insights."
    : `Your spending in '${topCategory}' is currently your primary focus. Optimizing this area could accelerate your savings momentum.`;

  const formatCurrency = (val) => {
    try {
      return new Intl.NumberFormat(profile?.language || 'en-US', {
        style: 'currency',
        currency: profile?.currency || 'USD',
      }).format(val);
    } catch (e) {
      // Fallback if currency code is invalid (like the FCAF error)
      return new Intl.NumberFormat(profile?.language || 'en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
      }).format(val) + ` ${profile?.currency || ''}`;
    }
  };

  // Fetch Investment Ideas from AI
  useEffect(() => {
    const getInvestmentIdeas = async () => {
      if (totalIncome > 0 && investmentIdeas.length === 0) {
        try {
          const { data, error } = await supabase.functions.invoke('GEMINII_API_KEY', {
            body: { 
              mode: 'investment_ideas', 
              context: { 
                income: totalIncome, 
                expenses: totalExpense, 
                currency: profile?.currency || 'USD' 
              } 
            }
          });
          if (data && Array.isArray(data)) {
            setInvestmentIdeas(data);
          }
        } catch (err) {
          console.error("Failed to fetch investment ideas", err);
        }
      }
    };

    const timer = setTimeout(getInvestmentIdeas, 3000); // Debounce call
    return () => clearTimeout(timer);
  }, [totalIncome, totalExpense, profile?.currency]);

  // Monthly Summary Alert Trigger
  useEffect(() => {
    const triggerSummaryNotification = async () => {
      if (profile?.monthly_summaries) {
        const lastSummaryCheck = localStorage.getItem('last_monthly_summary');
        const currentMonthYear = `${now.getMonth()}-${now.getFullYear()}`;
        
        if (lastSummaryCheck !== currentMonthYear) {
          // Show toast notification
          toast.success(`📊 ${t('monthlyFinancialSummaries')} available! Check your performance reports.`);

          // Trigger email notification via Edge Function
          if (user?.email && profile?.monthly_summaries) {
            await supabase.functions.invoke('RESEND_API_KEY', {
              body: {
                type: 'monthly_summary',
                recipientEmail: user.email,
                payload: { monthName: now.toLocaleString('default', { month: 'long' }), year: now.getFullYear(), totalIncome, totalExpenses: totalExpense, netSavings: netWorth, currency: profile?.currency || 'USD' }
              }
            });
          }

          localStorage.setItem('last_monthly_summary', currentMonthYear);
        }
      }
    };
    
    if (user?.id) triggerSummaryNotification();
  }, [profile?.monthly_summaries, t, user?.email, user?.id, totalIncome, totalExpense, netWorth, profile?.currency, now]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Custom PWA Install Banner */}
      {deferredPrompt && (
        <div className="mb-10 animate-in slide-in-from-top-4 duration-500 md:hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Download size={120} />
            </div>
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                <Sparkles className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Install PST System</h3>
                <p className="text-indigo-100 text-sm font-medium">Add to your home screen for a premium, app-like experience and offline access.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
              <button 
                onClick={() => setDeferredPrompt(null)}
                className="p-4 text-white/60 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <button 
                onClick={handleInstallClick}
                className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 font-bold rounded-full shadow-lg hover:bg-indigo-50 transition-all active:scale-95"
              >
                Install Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div> 
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">Personal Saving Tracker</p>
          <h1 className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
            {t('welcomeBack')}, {profile?.full_name?.split(' ')[0] || user?.user_metadata?.firstName || user?.email?.split('@')[0] || ''}.
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">
            Financial summary for current period
          </p>
        </div>
      </header>

      {/* Key Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <MetricCard title={t('netWorth')} value={formatCurrency(netWorth)} icon={<Wallet />} color="indigo" trend="12.4%" />
        <MetricCard title={t('totalIncome')} value={formatCurrency(totalIncome)} icon={<TrendingUp />} color="emerald" trend="+$2.4k" isPositive />
        <MetricCard title={t('totalExpenses')} value={formatCurrency(totalExpense)} icon={<Receipt />} color="rose" trend="4.2%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-8 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-2xl font-extrabold tracking-tight dark:text-white">{t('recentActivity')}</h3>
              <Link to="/transactions" className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">{t('viewAllLedger')}</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{t('transactions')}</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{t('date')}</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{t('category')}</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentActivity.map((act, i) => (
                    <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 ${act.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'} rounded-full flex items-center justify-center`}>
                             {act.type === 'income' ? <Briefcase className="text-emerald-600 dark:text-emerald-400" size={18}/> : <ShoppingBag className="text-indigo-600 dark:text-indigo-400" size={18}/>}
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{act.category || 'Entry'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-500 dark:text-slate-400 font-medium">{formatDate(act.date)}</td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                          {act.category || 'General'}
                        </span>
                      </td>
                      <td className={`px-8 py-6 text-right font-extrabold ${act.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-white'}`}>
                        {act.type === 'income' ? '+' : '-'}{formatCurrency(act.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Investment Insight (Formerly Strategy) Card */}
          <div className="bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl overflow-hidden relative p-8 flex flex-col justify-between min-h-[350px] shadow-xl">
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 pointer-events-none">
              <Sparkles size={160} />
            </div>
            <div className="relative z-10">
              <div className="mb-6">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30">
                  {t('Investment Insight')}
                </span>
              </div>

              <h3 className="text-3xl font-black tracking-tighter mt-6 mb-8 leading-tight">
                {t('investmentInsight')}
              </h3>
              <ul className="space-y-4">
                {(investmentIdeas.length > 0 ? investmentIdeas : [t('generatingIdeas')]).map((idea, idx) => (
                  <li key={idx} className="flex gap-3 text-sm font-medium text-indigo-100">
                    <span className="text-indigo-300 font-bold">{idx + 1}.</span> {idea}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Chart Mockup */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-extrabold text-lg tracking-tight dark:text-white">{t('incomeFlow')}</h3>
              <MoreHorizontal className="text-slate-400 cursor-pointer" />
            </div>
            <div className="flex items-end gap-2 h-40 mb-6">
              {monthlyData.map((d, i) => (
                <div 
                  key={i} 
                  style={{ height: `${(d.value / maxIncome) * 100}%` }}
                  className={`flex-1 ${d.value === bestMonthAmount && d.value > 0 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-700'} rounded-t-lg transition-all hover:bg-indigo-400 group relative`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
              {monthlyData.map((d, i) => <span key={i}>{d.label}</span>)}
            </div>
            <div className="pt-8 border-t border-slate-100 dark:border-slate-700 flex justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('averageMonthly')}</p>
                <p className="text-xl font-extrabold mt-1 dark:text-white">{formatCurrency(avgMonthlyIncome)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('bestMonth')}</p>
                <p className="text-xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{formatCurrency(bestMonthAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual FAB */}
    </div>
  );
};

const MetricCard = ({ title, value, icon, color, trend, isPositive }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[220px]">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-full ${ 
        color === 'indigo' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
        color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
        'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' 
      }`}>
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <span className={`flex items-center gap-1 font-bold text-sm px-3 py-1 rounded-full ${isPositive ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400'}`}>
        {trend}
      </span>
    </div>
    <div className="mt-4">
      <p className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</p>
      <h2 className={`text-4xl font-extrabold tracking-tighter mt-1 dark:text-white`}>{value}</h2>
    </div>
  </div>
);

export default Dashboard;