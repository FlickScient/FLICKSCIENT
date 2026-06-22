// @ts-nocheck
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [mode,       setMode]       = useState('login');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [msg,        setMsg]        = useState({ text: '', ok: false });
  const [forgotMode, setForgotMode] = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', ok: false });
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (error) setMsg({ text: error.message, ok: false });
    else if (mode === 'signup') setMsg({ text: 'Check your email to confirm your account ✓', ok: true });
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', ok: false });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setMsg({ text: error.message, ok: false });
    else setMsg({ text: 'Reset link sent — check your email ✓', ok: true });
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setMsg({ text: error.message, ok: false }); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
      <div className="relative w-full overflow-hidden flex"
        style={{
          maxWidth: 900, minHeight: 560, borderRadius: 20,
          border: '1px solid rgba(234,179,8,0.35)',
          boxShadow: '0 0 0 1px rgba(234,179,8,0.12), 0 0 40px rgba(234,179,8,0.18), 0 0 80px rgba(234,179,8,0.08), 0 32px 80px rgba(0,0,0,0.8)',
        }}>
        {/* ── LEFT PANEL ── */}
        <div className="relative z-10 flex flex-col justify-between w-full md:w-[55%] px-8 py-10 flex-shrink-0"
          style={{ background: '#0d0d14', minHeight: 560 }}>
          <div>
            <div className="flex flex-col items-start gap-2 mb-8">
              <img src="/favicon.svg" width={48} height={48} alt="MovieSync logo" style={{ display: 'block' }} />
              <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.6rem', letterSpacing: '0.04em', lineHeight: 1.1, color: '#fff', marginTop: 4 }}>
                Movie<span style={{ color: '#EAB308' }}>Sync</span>
              </h1>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', fontVariant: 'small-caps', letterSpacing: '0.3em', color: 'rgba(234,179,8,0.55)', textTransform: 'uppercase', marginTop: 2 }}>
                The Ultimate Canon
              </p>
            </div>

            {forgotMode ? (
              <div>
                <button onClick={() => { setForgotMode(false); setMsg({ text: '', ok: false }); }}
                  className="flex items-center gap-1.5 text-xs mb-6 transition-opacity hover:opacity-80"
                  style={{ color: 'rgba(234,179,8,0.6)' }}>
                  ← Back to login
                </button>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.05rem', color: '#fff', fontWeight: 600, marginBottom: 6 }}>Reset Password</p>
                <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Enter your email and we'll send a reset link.</p>
                <form onSubmit={handleForgot} className="space-y-5">
                  <div style={{ borderBottom: '1px solid rgba(234,179,8,0.35)' }} className="pb-1">
                    <input type="email" placeholder="Email address" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-white placeholder-gray-600 py-1"
                      style={{ caretColor: '#EAB308' }} />
                  </div>
                  {msg.text && (
                    <p className={`text-[12px] text-center font-medium px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {msg.text}
                    </p>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-black active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #EAB308 0%, #ca9a07 100%)', boxShadow: '0 4px 20px rgba(234,179,8,0.35)', fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>
                    {loading ? '···' : 'Send Reset Link'}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="flex mb-7 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['login', 'signup'].map(m => (
                    <button key={m} onClick={() => { setMode(m); setMsg({ text: '', ok: false }); }}
                      className="flex-1 pb-2.5 text-sm font-semibold transition-all relative"
                      style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.06em', color: mode === m ? '#EAB308' : 'rgba(255,255,255,0.3)' }}>
                      {m === 'login' ? 'Log In' : 'Sign Up'}
                      {mode === m && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                          style={{ background: '#EAB308', boxShadow: '0 0 8px rgba(234,179,8,0.7)' }} />
                      )}
                    </button>
                  ))}
                </div>

                <button onClick={handleGoogle} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-3 rounded-xl mb-5 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.4)', letterSpacing: '0.02em' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 12.075 17.64 9.768 17.64 9.2z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>or</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                  <div style={{ borderBottom: '1px solid rgba(234,179,8,0.3)' }} className="pb-1">
                    <input type="email" placeholder="Email address" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-white placeholder-gray-600 py-1"
                      style={{ caretColor: '#EAB308' }} />
                  </div>
                  <div className="relative pb-1" style={{ borderBottom: '1px solid rgba(234,179,8,0.3)' }}>
                    <input type={showPwd ? 'text' : 'password'} placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-white placeholder-gray-600 py-1 pr-8"
                      style={{ caretColor: '#EAB308' }} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                      className="absolute right-0 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {msg.text && (
                    <p className={`text-[12px] text-center font-medium px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {msg.text}
                    </p>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-black active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #EAB308 0%, #ca9a07 100%)', boxShadow: '0 4px 24px rgba(234,179,8,0.4)', fontFamily: "'Cinzel', serif", letterSpacing: '0.06em' }}>
                    {loading ? '···' : mode === 'login' ? 'Log In' : 'Create Account'}
                  </button>

                  {mode === 'login' && (
                    <button type="button" onClick={() => { setForgotMode(true); setMsg({ text: '', ok: false }); }}
                      className="w-full text-center text-[11px] transition-opacity hover:opacity-80"
                      style={{ color: 'rgba(234,179,8,0.5)' }}>
                      Forgot password?
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>

          <p className="text-[10px] mt-8" style={{ color: 'rgba(234,179,8,0.4)' }}>
            Made by <span style={{ color: '#EAB308', fontWeight: 700 }}>Mahmudul Hasan Mahid</span>
          </p>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="hidden md:flex relative flex-col items-center justify-center flex-1 overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #1a1200 0%, #2d1f00 60%, #1a1200 100%)', clipPath: 'polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%)' }}>
          <div className="absolute left-0 top-0 bottom-0 pointer-events-none"
            style={{ width: 2, background: 'linear-gradient(to bottom, transparent 0%, #EAB308 30%, #EAB308 70%, transparent 100%)', boxShadow: '0 0 12px 2px rgba(234,179,8,0.6), 0 0 30px 4px rgba(234,179,8,0.25)', transform: 'skewX(-4deg)', transformOrigin: 'top' }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 60% 50%, rgba(234,179,8,0.12) 0%, transparent 70%)' }} />
          <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-20">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="w-2 h-3 rounded-sm" style={{ background: '#EAB308' }} />
            ))}
          </div>
          <div className="absolute bottom-6 left-10 flex flex-col gap-2 opacity-20">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-2 h-3 rounded-sm" style={{ background: '#EAB308' }} />
            ))}
          </div>
          <div className="relative z-10 text-center px-10">
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.06em', lineHeight: 1.15, textShadow: '0 0 40px rgba(234,179,8,0.3)', marginBottom: 16 }}>
              {mode === 'signup' ? 'JOIN US!' : 'WELCOME\nBACK!'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 220, margin: '0 auto' }}>
              Hope, You and your Family<br />have a Great Day
            </p>
            <div className="flex items-center gap-3 mt-6 justify-center">
              <div style={{ width: 32, height: 1, background: 'rgba(234,179,8,0.5)' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EAB308', boxShadow: '0 0 8px rgba(234,179,8,0.8)' }} />
              <div style={{ width: 32, height: 1, background: 'rgba(234,179,8,0.5)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
