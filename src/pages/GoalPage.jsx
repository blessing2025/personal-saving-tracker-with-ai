import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { useNumberFormatter } from 'react-aria';
import { db } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient'; // Import supabase client
import { Target, Plus, Trash2, ArrowRight, Laptop, Car, Palmtree, PlusCircle, MoreVertical, CalendarDays, ChevronDown } from 'lucide-react';

export default function GoalPage() {
  const { t, profile, formatDate } = useTranslation();
  const { user } = useAuth();
  const { register, handleSubmit, reset } = useForm();
  const [contributionInputs, setContributionInputs] = useState({});
  const [formFrequency, setFormFrequency] = useState('monthly');
  const [sortBy, setSortBy] = useState('default');
  // console.log("[DEBUG] GoalPage rendered. Current frequency view:", viewFrequency); // Moved to Dashboard

  const formatter = useNumberFormatter({
    style: 'currency',
    currency: profile?.currency === 'FCAF' ? 'XAF' : profile?.currency || 'USD',
    currencyDisplay: 'symbol'
  });

  // Reactive data fetching
  const goals = useLiveQuery(() => 
    db.goals.where('user_id').equals(user?.id || '').filter(item => !item._deleted).toArray()
  , [user]) || [];

  const sortedGoals = React.useMemo(() => {
    const list = [...goals];
    if (sortBy === 'deadline') {
      return list.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    }
    return list;
  }, [goals, sortBy]);

  // Calculate overall momentum
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.saved_amount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const onSubmit = async (data) => {
    try {
      if (parseFloat(data.target_amount) <= 0) {
        toast.error(t('validAmount'));
        return;
      }

      await db.goals.add({
        id: crypto.randomUUID(),
        user_id: user.id,
        name: data.name,
        target_amount: parseFloat(data.target_amount),
        saved_amount: 0,
        deadline: data.deadline,
        color: 'bg-indigo-600',
        frequency: formFrequency,
        created_at: new Date().toISOString(),
        synced_at: null
      });
      toast.success(t('goalCreated'));
      reset();
    } catch (err) {
      toast.error('Failed to create goal');
    }
  };

  const handleContribution = async (goal) => {
    const id = goal.id;
    const currentAmount = goal.saved_amount;
    const amount = contributionInputs[id];
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('validAmount'));
      return;
    }

    const remaining = goal.target_amount - (currentAmount || 0);

    if (parsedAmount > remaining) {
      toast.error(t('amountExceedsGoal'));
      return;
    }

    const newSavedAmount = (currentAmount || 0) + parsedAmount;

    try {
      await db.goals.update(id, {
        saved_amount: newSavedAmount,
        synced_at: null
      });

      // Check if goal is completed and send alert if preference is enabled
      const updatedGoal = await db.goals.get(id);
      const isAlertEnabled = profile?.goal_alerts ?? true;
      if (updatedGoal && updatedGoal.saved_amount >= updatedGoal.target_amount && isAlertEnabled && user?.email) {
        toast.success(`🎉 ${t('goalCompleted')}!`);
        
        // Fire and forget the notification so it doesn't block the UI or show false errors
        supabase.functions.invoke('RESEND_API_KEY', {
          body: {
            type: 'goal_completed',
            recipientEmail: user.email,
            payload: { 
              goalName: updatedGoal.name, 
              savedAmount: updatedGoal.saved_amount, 
              targetAmount: updatedGoal.target_amount, 
              currency: profile?.currency || 'USD' 
            }
          }
        }).catch(err => console.error("Email notification failed:", err));

      } else {
        toast.success(t('contributionAdded'));
      }

      // Clear the input for this specific goal
      setContributionInputs(prev => ({ ...prev, [id]: '' }));
    } catch (err) {
      toast.error('Failed to update goal');
    }
  };

  const updateGoalFrequency = async (id, newFrequency) => {
    try {
      await db.goals.update(id, { frequency: newFrequency, synced_at: null });
    } catch (err) {
      toast.error('Failed to update frequency');
    }
  };

  const handleDelete = async (id) => {
    try {
      const originalItem = await db.goals.get(id);
      await db.goals.update(id, { _deleted: true, synced_at: null });
      
      toast((tToast) => (
        <div className="flex items-center justify-between gap-4 min-w-[220px]">
          <span className="text-sm font-medium">{t('deleteSuccess')}</span>
          <button 
            onClick={async () => {
              await db.goals.update(id, { _deleted: false, synced_at: originalItem.synced_at });
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
      toast.error('Failed to delete goal');
    }
  };

  const getIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('laptop') || n.includes('mac')) return <Laptop size={20} />;
    if (n.includes('car') || n.includes('suv')) return <Car size={20} />;
    if (n.includes('vacation') || n.includes('trip') || n.includes('coast')) return <Palmtree size={20} />;
    return <Target size={20} />;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-screen-2xl mx-auto space-y-10">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-indigo-900 dark:text-white mb-3 font-headline">
            {t('savingGoals')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light max-w-2xl">
            Plan for the future and track your progress with editorial precision. Every contribution brings your vision closer to reality.
          </p>
        </div>

      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Create Goal Sidebar */}
        <section className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-indigo-900/5">
          <h2 className="text-xl font-bold text-indigo-900 dark:text-white mb-6 flex items-center gap-2 font-headline">
            <PlusCircle className="text-indigo-600 dark:text-indigo-400" size={20} />
            {t('setNewGoal')}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 ml-1">{t('goalName')}</label>
              <input 
                {...register('name', { required: true })}
                className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl py-4 px-5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-body" 
                placeholder="e.g., Summer Yacht" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 ml-1">{t('target')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {profile?.currency === 'XAF' ? 'FCFA' : profile?.currency || '$'}
                </span>
                <input 
                  {...register('target_amount', { required: true })}
                  className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl py-4 pl-16 pr-5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-body" 
                  placeholder="0.00" 
                  type="number" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 ml-1">{t('deadline')}</label>
              <input 
                {...register('deadline')}
                className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl py-4 px-5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-body" 
                type="date" 
              />
            </div>
            {/* Frequency Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 ml-1">{t('frequency')}</label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <CalendarDays className="absolute left-4 text-indigo-600 dark:text-indigo-400 pointer-events-none" size={18} />
                <select 
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  className="w-full bg-transparent border-none py-4 pl-12 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:ring-0 outline-none cursor-pointer appearance-none font-body"
                >
                  <option value="daily" className="text-slate-900">{t('daily')}</option>
                  <option value="weekly" className="text-slate-900">{t('weekly')}</option>
                  <option value="monthly" className="text-slate-900">{t('monthly')}</option>
                </select>
                <ChevronDown className="absolute right-4 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
            <button className="w-full bg-indigo-600 text-white rounded-full py-4 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-200 dark:shadow-none" type="submit">
              <span>{t('add')}</span>
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700 text-center">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 inline-block border border-emerald-100 dark:border-emerald-800">
              <p className="text-emerald-700 dark:text-emerald-400 text-sm font-semibold">{t('savingsTip')}</p>
            </div>
          </div>
        </section>

        {/* Goals Grid */}
        <section className="lg:col-span-8 space-y-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-900 dark:text-white font-headline">{t('Active goals') || 'Active Goals'}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('sort by')}</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 border-none rounded-lg py-1.5 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-0 outline-none cursor-pointer"
              >
                <option value="default">{t('default')}</option>
                <option value="deadline">{t('closest deadline')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedGoals.map((goal) => {
              const percentage = Math.min((goal.saved_amount / goal.target_amount) * 100, 100);
              
              // Calculate required contribution based on the goal's specific frequency
              const frequency = goal.frequency || 'monthly';
              const daysLeft = goal.deadline ? Math.max(1, Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24))) : null;
              let requiredAmount = 0;
              if (daysLeft && goal.saved_amount < goal.target_amount) {
                const remaining = goal.target_amount - goal.saved_amount;
                const divisor = frequency === 'daily' ? daysLeft : (frequency === 'weekly' ? daysLeft / 7 : daysLeft / 30);
                requiredAmount = remaining / divisor;
              }

              return (
                <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4">
                    <button onClick={() => handleDelete(goal.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="mb-6">
                    <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                      {getIcon(goal.name)}
                    </div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-headline truncate pr-4">{goal.name}</h3>
                      
                      {/* Individual Frequency Toggle */}
                      <select 
                        value={frequency}
                        onChange={(e) => updateGoalFrequency(goal.id, e.target.value)}
                        className="bg-slate-100 dark:bg-slate-700 border-none rounded-lg py-1 px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 focus:ring-0 outline-none cursor-pointer"
                      >
                        <option value="daily">{t('daily')}</option>
                        <option value="weekly">{t('weekly')}</option>
                        <option value="monthly">{t('monthly')}</option>
                      </select>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('deadline')}: {goal.deadline ? formatDate(goal.deadline) : 'No date'}</p>
                    
                    {/* Dynamic Required Contribution Display */}
                    {daysLeft && goal.saved_amount < goal.target_amount && (
                      <div className="mt-4 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 opacity-80">
                          {t('requiredContribution')} ({t(frequency)})
                        </span>
                        <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
                          {formatter.format(requiredAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-headline">{formatter.format(goal.saved_amount)}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm"> / {formatter.format(goal.target_amount)}</span>
                      </div>
                      <span className={`font-bold text-sm px-2 py-1 rounded-full ${percentage >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 rounded-full ${
                        percentage >= 100 ? 'bg-emerald-500' : 
                        (daysLeft !== null && daysLeft <= 7) ? 'bg-rose-500' : 
                        (daysLeft !== null && daysLeft <= 30) ? 'bg-amber-500' : 
                        'bg-indigo-600'
                      }`} 
                      style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder={t('amount')}
                      value={contributionInputs[goal.id] || ''}
                      onChange={(e) => setContributionInputs({ ...contributionInputs, [goal.id]: e.target.value })}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                    <button 
                      onClick={() => handleContribution(goal)}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition active:scale-95"
                    >
                      {t('add')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goal Insights Banner */}
          <div className="bg-indigo-600 dark:bg-indigo-700 text-white rounded-2xl overflow-hidden relative p-10 flex flex-col md:flex-row items-center gap-10 shadow-xl shadow-indigo-900/10">
            <div className="relative z-10 md:w-2/3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-4 block">{t('PST Momentum')}</span>
              <h2 className="text-4xl font-extrabold tracking-tight mb-4 font-headline leading-tight">
                {t('goalInsightTitle')}
              </h2>
              <p className="text-indigo-100 text-lg font-light">
                {t('goalInsightMsg')}
              </p>
            </div>
            <div className="relative z-10 md:w-1/3 flex justify-center">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/10" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-400 transition-all duration-1000" strokeWidth="3" strokeDasharray={`${overallProgress}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold font-headline">{overallProgress}%</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Overall</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}