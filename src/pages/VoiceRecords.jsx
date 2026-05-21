import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { 
  Mic, 
  Square, 
  Trash2, 
  Calendar, 
  ReceiptText, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  History,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/TranslationContext';
import { supabase } from '../lib/supabaseClient';

export default function VoiceRecords() {
  const { t, profile, deferredPrompt, setDeferredPrompt } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const recordings = useLiveQuery(() => 
    user ? db.voiceRecords.where('user_id').equals(user.id).filter(item => !item._deleted).toArray() : []
  , [user]) || [];

  const sortedRecordings = [...recordings].sort((a, b) => new Date(b.date) - new Date(a.date));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Detect supported mime type for better mobile compatibility (iOS prefers audio/mp4)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        const recordId = await db.voiceRecords.add({
          id: crypto.randomUUID(),
          user_id: user.id,
          blob: audioBlob,
          date: new Date().toISOString()
        });

        // Convert blob to base64 for the OpenAI Edge Function
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];
          setIsProcessing(true);
          const tid = toast.loading(t('processingAI'));

          try { 
            const { data, error } = await supabase.functions.invoke('GEMINII_API_KEY', {
              body: { 
                audio: base64Audio,
                contentType: mimeType 
              }
            });

            if (error) throw error;

            toast.success(t('parseSuccess'), { id: tid });
            // Navigate to expenses with the AI-extracted data
            navigate('/expenses', { state: { prefill: data } });
          } catch (err) {
            console.error("AI Processing Error:", err);
            toast.error(t('parseError'), { id: tid });
          } finally {
            setIsProcessing(false);
          }
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = async (id) => {
    try {
      const originalItem = await db.voiceRecords.get(id);
      await db.voiceRecords.update(id, { _deleted: true, synced_at: null });
      
      toast((tToast) => (
        <div className="flex items-center justify-between gap-4 min-w-[220px]">
          <span className="text-sm font-medium">{t('deleteSuccess')}</span>
          <button 
            onClick={async () => {
              await db.voiceRecords.update(id, { _deleted: false, synced_at: originalItem.synced_at });
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
      toast.error('Failed to delete recording');
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto space-y-12">
      {/* Hero Header */}
      <header>
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-indigo-900 dark:text-white mb-2">
          {t('voiceExpenseTracker')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
          {t('voiceMemoDescription')}
        </p>
      </header>

      {/* PWA Install Banner */}
      {deferredPrompt && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-indigo-900 dark:text-white">{t('installPSTSystem')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('installPSTSystemDescription')}</p>
            </div>
          </div>
          <button 
            onClick={handleInstallClick}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
          >
            {t('installNow')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recording Interface */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center relative overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm min-h-[480px]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-emerald-500"></div>
          
          <div className="text-center mb-10">
            <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
              {isProcessing ? t('loading') : isRecording ? t('recording') : t('readyToRecord')}
            </span>
            <h2 className="font-headline text-3xl font-extrabold text-slate-900 dark:text-white">
              {t('voiceMemoRecorder')}
            </h2>
          </div>

          <div className="relative group transition-transform duration-200">
            {(isRecording || isProcessing) && (
              <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${20 + (i % 3) * 20}%`, animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
            )}
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-95 ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : isRecording ? 'bg-rose-600' : 'bg-indigo-600'}`}
            >
              {isProcessing ? <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : isRecording ? <Square size={48} /> : <Mic size={48} />}
            </button>
          </div>

          <div className="mt-12 text-center max-w-sm">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {isProcessing ? t('processingAI') : isRecording ? t('recordingInProgress') : t('tapToCapture')}
            </p>
          </div>
        </section>

        {/* Recent Recordings Sidebar */}
        <section className="lg:col-span-5 space-y-8">
          <div className="bg-indigo-600 dark:bg-indigo-700 text-white p-8 rounded-2xl relative overflow-hidden shadow-xl">
            <h3 className="font-headline text-xl font-bold mb-2 flex items-center gap-2">
              {t('voiceRecordsHowItWorks')}
            </h3>
            <p className="text-sm text-indigo-100 opacity-90 leading-relaxed">
              {t('voiceRecordsHowItWorksDescription')}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-headline font-bold text-slate-900 dark:text-white mb-6">{t('recentVoiceEntries')}</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {sortedRecordings.map((rec) => (
                <div key={rec.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{t('voiceNote')}</span>
                    </div>
                    <button onClick={() => deleteRecording(rec.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <audio controls src={URL.createObjectURL(rec.blob)} className="h-8 w-full filter dark:brightness-90" />
                  <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase">
                    <span className="flex items-center gap-1"><History size={12} /> {new Date(rec.date).toLocaleTimeString()}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(rec.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {sortedRecordings.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm italic">
                  {t('noVoiceNotesCaptured')}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link to="/expenses" className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:bg-indigo-50 transition-all group shadow-sm">
              <ReceiptText size={20} className="text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-slate-800 dark:text-white text-sm">{t('manualEntry')}</p>
            </Link>
            <button className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:bg-indigo-50 transition-all group shadow-sm">
              <Upload size={20} className="text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-slate-800 dark:text-white text-sm">{t('importAudio')}</p>
            </button>
          </div>
        </section>
      </div>

      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard title={t('storage')} value={t('indexedDB')} desc={t('storageDesc')} color="indigo" />
        <FeatureCard title={t('privacy')} value={t('secure100')} desc={t('privacyDesc')} color="emerald" />
        <FeatureCard title={t('accessibility')} value={t('offline')} desc={t('accessibilityDesc')} color="rose" icon={<ShieldCheck size={24} />} />
      </section>
    </div>
  );
}

const FeatureCard = ({ title, value, desc, color, icon }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
    <p className={`text-[10px] font-bold uppercase tracking-widest mb-6 ${color === 'indigo' ? 'text-indigo-600' : color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'}`}>{title}</p>
    <div className="h-40 rounded-xl bg-slate-50 dark:bg-slate-900/50 mb-6 flex items-center justify-center border border-slate-100 dark:border-slate-700">
       <div className={`w-16 h-16 rounded-full flex items-center justify-center ${color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {icon || <Mic size={28} />}
       </div>
    </div>
    <h4 className="font-headline text-lg font-bold text-slate-900 dark:text-white mb-2">{value}</h4>
    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);