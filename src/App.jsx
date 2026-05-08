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
import { Menu, Wallet, ArrowRight } from 'lucide-react';
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
  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-4xl w-full">
        <div className="flex items-center justify-center gap-3 mb-8 animate-in fade-in zoom-in slide-in-from-top-12 duration-1000 ease-out">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <span className="text-4xl font-black text-indigo-900 dark:text-white tracking-tighter">PST System</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 font-headline">
          Professional Financial <span className="text-indigo-600">Tracking</span>
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto font-medium">
          {t('startJourney')} — A professional-grade ledger for your personal wealth management.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/login" className="px-10 py-5 bg-indigo-600 text-white rounded-full font-bold text-lg shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2">
            {t('signIn')} <ArrowRight size={20} />
          </Link> 
          <Link to="/register" className="px-10 py-5 bg-white dark:bg-slate-900 text-indigo-600 dark:text-white border border-slate-200 dark:border-slate-800 rounded-full font-bold text-lg hover:bg-slate-50 transition-all">
            {t('registerNow')}
          </Link>
        </div>
      </div>
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
