import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { I18nProvider } from 'react-aria';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register'; // Import Register
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import IncomePage from './pages/IncomePage';
import ExpensePage from './pages/ExpensePage';
import GoalPage from './pages/GoalPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import VoiceRecords from './pages/VoiceRecords';
import AuthCallback from './api/auth/callback/google';
import LoadingScreen from './components/common/LoadingScreen';
import { 
  Menu, 
  Wallet, 
  ArrowRight, 
  LayoutDashboard, 
  TrendingUp, 
  Receipt, 
  Target, 
  PieChart, 
  Mic, 
  Shield,
  CheckCircle2
} from 'lucide-react';
import { db } from './lib/db';
import { useOfflineSync } from './hooks/useOfflineSync'; // Import the offline sync hook
import { Toaster } from 'react-hot-toast';
import { translations } from './lib/translations';
import { TranslationContext, useTranslation } from './contexts/TranslationContext';

// Simple Error Boundary to catch component crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("App Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Something went wrong.</h2>
          <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold">
            Return to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper to protect private routes
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// New Public Landing Component
const Landing = () => {
  const { t } = useTranslation();
  
  const features = [
    {
      title: t('dashboard'),
      desc: t('lifestyleInsightMsg'),
      icon: <LayoutDashboard size={24} />,
      color: 'bg-indigo-100 text-indigo-600',
      screenshot: 'Dashboard'
    },
    {
      title: t('incomeManagement'),
      desc: t('incomePageDescription'),
      icon: <TrendingUp size={24} />,
      color: 'bg-emerald-100 text-emerald-600',
      screenshot: 'Income Ledger'
    },
    {
      title: t('expenseManagement'),
      desc: t('expensePageDescription'),
      icon: <Receipt size={24} />,
      color: 'bg-rose-100 text-rose-600',
      screenshot: 'Expense Tracker'
    },
    {
      title: t('savingGoals'),
      desc: t('goalPageDescription'),
      icon: <Target size={24} />,
      color: 'bg-amber-100 text-amber-600',
      screenshot: 'Goals & Progress'
    },
    {
      title: t('performanceReports'),
      desc: t('yearToDateAnalysis'),
      icon: <PieChart size={24} />,
      color: 'bg-purple-100 text-purple-600',
      screenshot: 'Advanced Analytics'
    },
    {
      title: t('voiceExpenseTracker'),
      desc: t('voiceMemoDescription'),
      icon: <Mic size={24} />,
      color: 'bg-blue-100 text-blue-600',
      screenshot: 'AI Voice Command'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-slate-950 transition-colors duration-500 overflow-x-hidden font-body">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-xl font-black text-indigo-900 dark:text-white tracking-tighter">PST System</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">{t('signIn')}</Link>
          <Link to="/register" className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95">
            {t('getStarted')}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <Shield size={14} />
            {t('privacySecurity')}
          </div>
          <h1 className="text-5xl md:text-8xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 font-headline leading-[0.9] max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
            The New Standard in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">Personal Finance</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            Professional-grade wealth management tailored for individual precision. Offline-first, AI-powered, and strictly private.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <Link to="/register" className="px-10 py-5 bg-indigo-600 text-white rounded-full font-bold text-lg shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2">
              {t('createFreeAccount')} <ArrowRight size={20} />
            </Link>
            <div className="flex -space-x-3 items-center ml-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800" />
              ))}
              <span className="ml-6 text-sm font-bold text-slate-500 dark:text-slate-400">Join 2,000+ Precise Savers</span>
            </div>
          </div>

          {/* Main Screenshot Placeholder */}
          <div className="mt-24 max-w-5xl mx-auto relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-[#f8f9fb] dark:from-slate-950 via-transparent to-transparent z-10"></div>
            <div className="relative aspect-video bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in duration-1000 delay-500">
               <img 
                src="dashboard.png" 
                alt="Main Dashboard Preview" 
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
               />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-32 px-6 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-4">{t('detailedForecast')}</h2>
            <h3 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white font-headline tracking-tighter leading-tight">Everything you need to <br/> scale your net worth.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="group bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4 font-headline">{feature.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                  {feature.desc}
                </p>
                
                {/* Individual Page Screenshot Placeholder */}
                <div className="aspect-video bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative group-hover:border-indigo-500/50 transition-colors">
                  <img 
                    src="expense.png" 
                    alt="Expense page screenshot" 
                    className="w-full h-full object-cover opacity-60"
                   
                  />
                  <img 
                    src="income.png" 
                    alt="Income page screenshot" 
                    className="w-full h-full object-cover opacity-60"
                   
                  />
                  <img 
                    src="report.png" 
                    alt="Report page screenshot" 
                    className="w-full h-full object-cover opacity-60"
                   
                  />
                  <img 
                    src="saving.png" 
                    alt="Savings page screenshot" 
                    className="w-full h-full object-cover opacity-60"
                   
                  />
                  <img 
                    src="tran.png" 
                    alt="Transaction page screenshot" 
                    className="w-full h-full object-cover opacity-60"
                   
                  />
                  <img 
                    src="voice.png" 
                    alt="Voice recording page screenshot" 
                    className="w-full h-full object-cover opacity-60"
                   
                  />
                  <img 
                    src="setting.png" 
                    alt="Settings page screenshot" 
                    className="w-full h-full object-cover opacity-60"
                   
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Security */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-indigo-600 rounded-[3rem] p-12 md:p-20 text-white text-center relative overflow-hidden shadow-2xl shadow-indigo-900/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-3xl md:text-5xl font-extrabold font-headline mb-8 leading-tight">Your data belongs to you. <br/> Period.</h3>
            <p className="text-indigo-100 text-lg mb-12 max-w-2xl mx-auto">
              PST System uses local-first encryption. Your financial records are stored in your browser's secure enclave (IndexedDB) and only synced to the cloud via Supabase's military-grade infrastructure when you're online.
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" />
                <span className="font-bold">Offline Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" />
                <span className="font-bold">AES-256 Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" />
                <span className="font-bold">No 3rd Party Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-12 font-headline tracking-tighter">Ready to take control?</h2>
        <Link to="/register" className="inline-flex items-center gap-2 px-12 py-6 bg-indigo-600 text-white rounded-full font-bold text-xl shadow-2xl hover:bg-indigo-700 transition-all active:scale-95">
          Join PST System Now <ArrowRight size={24} />
        </Link>
        <p className="mt-8 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest">Free for personal use • No credit card required</p>
      </section>

      {/* Bottom Branding */}
      <footer className="py-12 px-6 border-t border-slate-200 dark:border-slate-800 text-center opacity-40">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-loose">
          © 2026 Personal Saving Tracker System <br/>
          Precision Financial Engineering
        </p>
      </footer>
    </div>
  );
};

// Shared layout for all authenticated pages to avoid repetitive JSX
const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <header className="h-16 flex items-center px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
        >
          <Menu size={24} />
        </button>
      </header>
      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
};

// This internal component ensures hooks that use AuthContext are inside the Provider
const AppContent = () => {
  useOfflineSync(); // Initialize offline synchronization
  const { user, loading } = useAuth();
  const [isAppReady, setIsAppReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    // Ensure the animated transition plays for at least 2 seconds on first load
    const timer = setTimeout(() => setIsAppReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const profile = useLiveQuery(
    () => (user ? db.profiles.get(user.id) : null),
    [user]
  );

  // Apply Dark Mode class to the document root
  useEffect(() => {
    // Default to 'light' if profile or theme is missing
    const currentTheme = profile?.theme || 'light';
    const isDark = currentTheme === 'dark';

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [profile?.theme]);

  // Memoize the translation function and add robust locale matching
  const t = useCallback((key) => {
    const lang = profile?.language || 'en-US';
    
    // 1. Try exact match (e.g., 'es-ES')
    // 2. Try base language match (e.g., if lang is 'es', find 'es-ES')
    const matchedLang = translations[lang] ? lang : 
                        Object.keys(translations).find(l => l.startsWith(lang.split('-')[0])) || 'en-US';

    return translations[matchedLang]?.[key] || translations['en-US']?.[key] || key;
  }, [profile?.language]);

  // Centralized date formatting based on user preference from settings
  const formatDate = useCallback((dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const formatStr = profile?.date_format || 'DD/MM/YYYY';
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    switch (formatStr) {
      case 'MM/DD/YYYY':
        return `${mm}/${dd}/${yyyy}`;
      case 'YYYY-MM-DD':
        return `${yyyy}-${mm}-${dd}`;
      default:
        return `${dd}/${mm}/${yyyy}`;
    }
  }, [profile?.date_format]);

  if (loading || !isAppReady) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 animate-bounce">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-black text-indigo-900 dark:text-white tracking-tighter">PST System</h2>
            <div className="flex gap-1 justify-center mt-3">
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse delay-75"></div>
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <I18nProvider locale={profile?.language || 'en-US'}>
      <TranslationContext.Provider value={{ t, profile, formatDate, deferredPrompt, setDeferredPrompt }}>
      <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/api/auth/callback/google" element={<AuthCallback />} />

          {/* Private Routes wrapped in both Authentication and the App Shell Layout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/expenses" element={<ExpensePage />} />
            <Route path="/goals" element={<GoalPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/voice-notes" element={<VoiceRecords />} />
          </Route>
        </Routes>
      </div>
      </ErrorBoundary>
      </TranslationContext.Provider>
    </I18nProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
