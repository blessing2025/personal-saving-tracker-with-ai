import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../contexts/TranslationContext';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Receipt, 
  Target, 
  BarChart3, 
  Mic, 
  Settings, 
  User,
  LogOut,
  Wallet,
  History,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: t('dashboard') },
    { to: '/income', icon: <TrendingUp size={20} />, label: t('income') },
    { to: '/expenses', icon: <Receipt size={20} />, label: t('expenses') },
    { to: '/goals', icon: <Target size={20} />, label: t('goals') },
    { to: '/reports', icon: <BarChart3 size={20} />, label: t('reports') },
    { to: '/voice-notes', icon: <Mic size={20} />, label: t('voiceNotes') },
    { to: '/transactions', icon: <History size={20} />, label: t('transactions') },
    { to: '/settings', icon: <Settings size={20} />, label: t('settings') },
  
  ];

  return (
    <>
      {/* Backdrop: Darkens the screen and closes sidebar when clicked outside */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" 
          onClick={onClose}
        /> 
      )}

      <aside className={`fixed left-0 top-0 h-screen w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col z-[60] transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" /> 
              </div>
              <span className="text-xl font-black text-indigo-900 dark:text-white tracking-tighter">PST System</span> 
            </div> 
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all 
                  ${isActive
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}
                `}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 space-y-1 border-t border-slate-100 dark:border-slate-800">
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all 
              ${isActive
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}
            `}
          >
            <User size={20} />
            {t('profile')}
          </NavLink>
          <button
            onClick={() => { signOut(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all mt-2"
          >
            <LogOut size={20} />
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  );
}