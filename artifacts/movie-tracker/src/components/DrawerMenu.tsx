// @ts-nocheck
import { useState } from 'react';
import {
  Sun, Moon, Sparkles, Download, Settings, User, LogOut,
  MessageSquare, Send, X, Film,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#a855f7,#ec4899)',
  'linear-gradient(135deg,#f97316,#ef4444)',
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#d946ef,#6366f1)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#06b6d4,#8b5cf6)',
  'linear-gradient(135deg,#f43f5e,#f97316)',
  'linear-gradient(135deg,#8b5cf6,#3b82f6)',
  'linear-gradient(135deg,#ec4899,#f97316)',
  'linear-gradient(135deg,#0ea5e9,#10b981)',
  'linear-gradient(135deg,#f43f5e,#8b5cf6)',
  'linear-gradient(135deg,#eab308,#f97316)',
  'linear-gradient(135deg,#6366f1,#ec4899)',
  'linear-gradient(135deg,#14b8a6,#6366f1)',
  'linear-gradient(135deg,#c026d3,#3b82f6)',
];

function avatarHash(email: string): number {
  if (!email) return 0;
  let h = 0;
  for (let i = 0; i < email.length; i++) { h = Math.imul(31, h) + email.charCodeAt(i) | 0; }
  return Math.abs(h) % AVATAR_GRADIENTS.length;
}

function DrawerItem({ icon, label, sub, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors text-left">
      <span className="text-gray-400">{icon}</span>
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
      </div>
    </button>
  );
}

export function WelcomeModal({ onDismiss, user }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative w-full max-w-sm bg-[#111116] rounded-3xl p-7 z-10 border border-white/10 shadow-2xl animate-slide-up">
        <button onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
        <div className="w-14 h-14 bg-yellow-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-yellow-500/20">
          <Film size={28} className="text-black" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Welcome to<br />MovieSync</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-2">
          Your personal masterpiece tracker. Build your library, track episodes, and rate everything you watch.
        </p>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Try the <span className="text-purple-400 font-bold">AI</span> tab for <span className="text-purple-400 font-bold">FlickScient</span> — your film intelligence powered by Groq.
        </p>
        <button onClick={onDismiss}
          className="w-full py-3.5 bg-yellow-500 text-black font-black rounded-2xl text-sm hover:bg-yellow-400 transition-all active:scale-95 shadow-lg shadow-yellow-500/20">
          Start Exploring
        </button>
        {user?.email && (
          <p className="text-center text-[11px] text-gray-700 mt-3">{user.email}</p>
        )}
      </div>
    </div>
  );
}

export default function DrawerMenu({ open, onClose, user, onLogout, onOpenSeed, theme, onToggleTheme }) {
  const email = user?.email || '';
  const initials = email ? email[0].toUpperCase() : '?';
  const avatarGradient = AVATAR_GRADIENTS[avatarHash(email)];
  const [feedbackText,   setFeedbackText]   = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle');

  const submitFeedback = async () => {
    if (!feedbackText.trim() || feedbackStatus === 'sending') return;
    setFeedbackStatus('sending');
    const { error } = await supabase.from('user_feedback').insert({ user_id: user?.id, message: feedbackText.trim() });
    if (error) { setFeedbackStatus('error'); return; }
    setFeedbackText('');
    setFeedbackStatus('done');
    setTimeout(() => setFeedbackStatus('idle'), 3500);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-[#111116] z-[70] border-r border-white/5 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="pt-14 pb-6 px-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-black flex-shrink-0"
              style={{ background: avatarGradient, backgroundImage: avatarGradient, boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.5)' }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white">My Account</p>
              <p className="text-[10px] text-gray-500 truncate">{email}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-1">
          <button onClick={onToggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors text-left">
            <span className={theme === 'light' ? 'text-amber-500' : theme === 'maestro' ? 'text-orange-500' : 'text-blue-400'}>
              {theme === 'light' ? <Sun size={18} /> : theme === 'maestro' ? <Sparkles size={18} /> : <Moon size={18} />}
            </span>
            <div>
              <p className="text-sm font-bold text-white">
                {theme === 'light' ? 'Light Mode' : theme === 'maestro' ? 'Maestro' : 'Dark Mode'}
              </p>
              <p className="text-[10px] text-gray-600">
                {theme === 'light' ? 'Switch to Maestro →' : theme === 'maestro' ? 'Switch to Dark →' : 'Switch to Light →'}
              </p>
            </div>
          </button>
          <DrawerItem icon={<Download size={18} />} label="Import 500 Films" sub="Seed your library from TMDB" onClick={() => { onOpenSeed(); onClose(); }} />
          <DrawerItem icon={<Settings size={18} />} label="Settings" sub="Preferences & account" onClick={() => { alert('Settings coming soon!'); onClose(); }} />
          <DrawerItem icon={<User size={18} />} label="Profile" sub={email} onClick={onClose} />
        </div>

        <div className="px-4 pt-4 pb-3 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2.5">
            <MessageSquare size={13} className="text-gray-600" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-gray-600 font-black">CORDIAL Feedback</p>
          </div>
          {feedbackStatus === 'done' ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-center">
              <p className="text-green-400 text-xs font-black">✓ Thank you! Feedback received.</p>
            </div>
          ) : (
            <>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Bug, idea, or just a thought…"
                rows={3}
                className="w-full bg-[#0d0d12] text-white text-xs p-3 rounded-xl border border-white/10 outline-none focus:border-yellow-500/30 resize-none placeholder-gray-700 leading-relaxed"
              />
              {feedbackStatus === 'error' && (
                <p className="text-red-400 text-[10px] mt-1">Failed — try again.</p>
              )}
              <button onClick={submitFeedback}
                disabled={!feedbackText.trim() || feedbackStatus === 'sending'}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold py-2.5 rounded-xl hover:bg-yellow-500/20 transition-all disabled:opacity-40 active:scale-[0.98]">
                <Send size={12} />
                {feedbackStatus === 'sending' ? 'Sending…' : 'Submit'}
              </button>
            </>
          )}
        </div>

        <div className="px-4 pb-8 border-t border-white/5 pt-4">
          <button onClick={() => { onLogout(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-900/20 text-red-400 border border-red-900/30 hover:bg-red-900/30 transition-colors">
            <LogOut size={18} />
            <div className="text-left">
              <p className="text-sm font-bold">Log Out</p>
            </div>
          </button>
          <p className="text-center text-[9px] text-gray-700 mt-4">
            Movie Sync · by <span className="text-yellow-800">Mahmudul Hasan Mahid</span>
          </p>
        </div>
      </div>
    </>
  );
}
