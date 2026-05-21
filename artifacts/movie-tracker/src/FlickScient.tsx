// @ts-nocheck
import { supabase, ANON_KEY_VALUE } from './lib/supabase';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Clapperboard, Link, Copy, Check, Users, ArrowLeft, Clock, Trash2, Plus } from 'lucide-react';

// ─── Mood Pills ───────────────────────────────────────────────────────────────
const MOOD_PILLS = [
  { emoji: '🧠', label: 'Mind-bending',  prompt: 'Give me a mind-bending sci-fi or psychological thriller that will mess with my head and make me question reality. Something that rewires my brain.' },
  { emoji: '🍿', label: 'Brain Rot',     prompt: 'Give me pure brain rot entertainment — something fun, dumb, and absolutely addictive. No thinking required.' },
  { emoji: '😭', label: 'Cry Session',   prompt: 'I need a film that will genuinely destroy me emotionally. Make me cry. Full devastation mode.' },
  { emoji: '😱', label: 'Edge of Seat',  prompt: 'I want something that keeps me on the absolute edge of my seat — pure tension, suspense, or thriller energy from start to finish.' },
  { emoji: '😂', label: 'Laugh Hard',    prompt: 'I need to laugh until my stomach hurts. Give me peak comedy — genuinely funny, not mid.' },
  { emoji: '🌙', label: '2AM Vibe',      prompt: "I'm up at 2am and need a perfect late night film. Atmospheric, a bit eerie, hits different in the dark." },
  { emoji: '💀', label: 'Peak Horror',   prompt: 'Hit me with the most psychologically disturbing horror you know. I want to be genuinely unsettled.' },
  { emoji: '💕', label: 'Feel Good',     prompt: 'I want a wholesome, feel-good film that leaves me smiling. Not cringe — actually peak heartwarming.' },
  { emoji: '🌍', label: 'World Cinema',  prompt: "Recommend me a hidden gem from non-English cinema. Something most people haven't seen but absolutely should." },
  { emoji: '⚡', label: 'Hype Mode',     prompt: 'Give me the most hype, high-energy, adrenaline-pumping film possible. Something that gets the blood pumping.' },
];

// ─── Chat History Utils ───────────────────────────────────────────────────────
const SESSIONS_KEY = 'fs_chat_sessions';
const MAX_SESSIONS = 40;

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; }
}

function saveSession(session) {
  try {
    const all = loadSessions().filter(s => s.id !== session.id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([session, ...all].slice(0, MAX_SESSIONS)));
  } catch {}
}

function deleteSessionById(id) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(loadSessions().filter(s => s.id !== id))); } catch {}
}

function sessionTitle(messages) {
  const first = messages.find(m => m.sender === 'user');
  if (!first) return 'New chat';
  return first.text.length > 50 ? first.text.slice(0, 50) + '…' : first.text;
}

function fmtDate(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString('en',{weekday:'short'});
  return d.toLocaleDateString('en',{month:'short',day:'numeric'});
}

// ─── Sync Room Utilities ──────────────────────────────────────────────────────
function encodePrefs(myList) {
  const watched = myList.filter(m => m.watched || m.status === 'watched');
  const favs    = myList.filter(m => m.favorite);
  const genres  = {};
  myList.forEach(m => { if (m.genre) genres[m.genre] = (genres[m.genre] || 0) + 1; });
  const topGenres = Object.entries(genres).sort((a,b) => b[1]-a[1]).slice(0,4).map(([g]) => g);
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify({
      g: topGenres, f: favs.slice(0,3).map(m=>m.title),
      w: watched.slice(-3).map(m=>m.title), c: watched.length,
    }))));
  } catch { return ''; }
}

function decodePrefs(raw) {
  try {
    const code = raw.includes('#sync=') ? raw.split('#sync=')[1] : raw.trim();
    return JSON.parse(decodeURIComponent(escape(atob(code))));
  } catch { return null; }
}

function buildSyncPrompt(hostPrefs, guestPrefs, hostName, guestName) {
  const h = hostName || 'Player 1', g = guestName || 'Player 2';
  return `🔗 MOVIESYNC GROUP SESSION — mediate a perfect movie night for ${h} and ${g}.

${h}'s taste:
• Top genres: ${(hostPrefs.g||[]).join(', ')||'varied'}
• Favorites:  ${(hostPrefs.f||[]).join(', ')||'not listed'}
• Recently watched: ${(hostPrefs.w||[]).join(', ')||'not listed'}
• Films watched: ${hostPrefs.c||0}

${g}'s taste:
• Top genres: ${(guestPrefs.g||[]).join(', ')||'varied'}
• Favorites:  ${(guestPrefs.f||[]).join(', ')||'not listed'}
• Recently watched: ${(guestPrefs.w||[]).join(', ')||'not listed'}
• Films watched: ${guestPrefs.c||0}

Drop exactly 3 compromise films both will love. For each, explain in 1 punchy sentence WHY it hits for BOTH of them.`;
}

// ─── Sync Room Component ──────────────────────────────────────────────────────
function SyncRoom({ myList, onSendToAI }) {
  const [phase,      setPhase]      = useState('land');
  const [myCode,     setMyCode]     = useState('');
  const [joinCode,   setJoinCode]   = useState('');
  const [myName,     setMyName]     = useState('');
  const [friendName, setFriendName] = useState('');
  const [copied,     setCopied]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    const match = window.location.hash.match(/#sync=([A-Za-z0-9+/=]+)/);
    if (match) { setJoinCode(match[1]); setPhase('join'); history.replaceState(null,'',window.location.pathname); }
  }, []);

  const createRoom = () => {
    if (myList.length === 0) { setError('Add some films to your library first!'); return; }
    setMyCode(encodePrefs(myList)); setPhase('created'); setError('');
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#sync=${myCode}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  const go = (hostCode, guestCode, hName, gName) => {
    const hp = decodePrefs(hostCode), gp = decodePrefs(guestCode);
    if (!hp || !gp) { setError('Invalid code — ask your friend to re-share the link.'); return; }
    onSendToAI(buildSyncPrompt(hp, gp, hName, gName));
  };

  const inputCls = "w-full bg-[#0a0a0c] text-white px-4 py-3 rounded-xl border border-gray-800 outline-none focus:border-blue-500/40 text-[13px] placeholder-gray-700 mb-3";

  if (phase === 'land') return (
    <div className="flex-1 overflow-y-auto p-5 space-y-3">
      <div className="bg-[#111118] rounded-3xl border border-white/5 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4"><Users size={26} className="text-blue-400" /></div>
        <h2 className="text-base font-black text-white mb-1">Group Sync</h2>
        <p className="text-[11px] text-gray-500 leading-relaxed">Share your taste with a friend. FlickScient finds 3 movies you'll both love.</p>
      </div>
      <button onClick={createRoom} className="w-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black py-4 px-5 rounded-2xl flex items-center gap-3 hover:bg-blue-500/20 transition-all active:scale-[0.98]">
        <Link size={18} />
        <div className="text-left"><div className="text-sm">Create a Sync Room</div><div className="text-[10px] text-blue-600 font-normal mt-0.5">Generate a shareable link for your friend</div></div>
      </button>
      <button onClick={() => { setPhase('join'); setError(''); }} className="w-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-black py-4 px-5 rounded-2xl flex items-center gap-3 hover:bg-purple-500/20 transition-all active:scale-[0.98]">
        <Users size={18} />
        <div className="text-left"><div className="text-sm">Join a Room</div><div className="text-[10px] text-purple-600 font-normal mt-0.5">Paste a link or code from your friend</div></div>
      </button>
      {error && <p className="text-red-400 text-[11px] text-center pt-1">{error}</p>}
    </div>
  );

  if (phase === 'created') return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <button onClick={() => setPhase('land')} className="flex items-center gap-1.5 text-gray-600 text-xs hover:text-gray-400 mb-1"><ArrowLeft size={13} /> Back</button>
      <div className="bg-[#111118] rounded-3xl border border-blue-500/20 p-5">
        <p className="text-[10px] uppercase tracking-widest text-blue-500 font-black mb-1">Room Ready ✓</p>
        <p className="text-[11px] text-gray-500 mb-4">Send this link to your friend. Once they join, paste their code below to sync.</p>
        <button onClick={copyLink} className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${copied ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-blue-500 text-black hover:bg-blue-400 active:scale-[0.98]'}`}>
          {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Sync Link</>}
        </button>
      </div>
      <div className="bg-[#111118] rounded-3xl border border-white/5 p-5">
        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-3">Match when friend joins</p>
        <input value={myName}     onChange={e=>setMyName(e.target.value)}     placeholder="Your name (optional)"        className={inputCls} />
        <input value={joinCode}   onChange={e=>setJoinCode(e.target.value)}   placeholder="Paste friend's link or code" className={inputCls} />
        <input value={friendName} onChange={e=>setFriendName(e.target.value)} placeholder="Friend's name (optional)"    className={inputCls} />
        <button onClick={() => go(myCode, joinCode, myName, friendName)} disabled={!joinCode.trim()}
          className="w-full bg-purple-500 text-white font-black py-4 rounded-2xl hover:bg-purple-400 transition-all disabled:opacity-30 active:scale-[0.98] text-sm">
          ⚡ Find Our Movies
        </button>
        {error && <p className="text-red-400 text-[11px] text-center mt-3">{error}</p>}
      </div>
    </div>
  );

  if (phase === 'join') return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <button onClick={() => setPhase('land')} className="flex items-center gap-1.5 text-gray-600 text-xs hover:text-gray-400 mb-1"><ArrowLeft size={13} /> Back</button>
      <div className="bg-[#111118] rounded-3xl border border-purple-500/20 p-5 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-purple-500 font-black mb-3">Join a Sync Room</p>
        <p className="text-[10px] text-gray-600 mb-1">Friend's link or code</p>
        <input value={joinCode}   onChange={e=>setJoinCode(e.target.value)}   placeholder="Paste link or code here"  className={inputCls} />
        <p className="text-[10px] text-gray-600 mb-1">Your name (optional)</p>
        <input value={myName}     onChange={e=>setMyName(e.target.value)}     placeholder="Your name"                className={inputCls} />
        <p className="text-[10px] text-gray-600 mb-1">Friend's name (optional)</p>
        <input value={friendName} onChange={e=>setFriendName(e.target.value)} placeholder="Friend's name"            className={inputCls} />
        <button onClick={() => {
          const guestPrefs = myList.length > 0 ? decodePrefs(encodePrefs(myList)) : {g:[],f:[],w:[],c:0};
          const hostPrefs  = decodePrefs(joinCode);
          if (!hostPrefs) { setError('Invalid code — paste the full link from your friend.'); return; }
          onSendToAI(buildSyncPrompt(hostPrefs, guestPrefs, friendName, myName));
        }} disabled={!joinCode.trim()}
          className="w-full bg-purple-500 text-white font-black py-4 rounded-2xl hover:bg-purple-400 transition-all disabled:opacity-30 active:scale-[0.98] text-sm mt-2">
          ⚡ Sync & Find Movies
        </button>
        {error && <p className="text-red-400 text-[11px] text-center mt-3">{error}</p>}
      </div>
    </div>
  );
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const WELCOME_MSG = {
  id: 'welcome', sender: 'ai',
  text: "Yo. I'm FlickScient — the Final Boss of film knowledge. I've mentally watched everything so you don't have to. Tell me your exact vibe right now, and I'll drop a cinematic masterpiece on your radar. What are we feeling? 🎬",
};

export default function FlickScient({ myList }) {
  const [messages,   setMessages]   = useState([WELCOME_MSG]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [aiTab,      setAiTab]      = useState('chat');
  const [sessionId,  setSessionId]  = useState(() => 'sid_' + Date.now());
  const [sessions,   setSessions]   = useState(() => loadSessions());
  const chatBottomRef = useRef(null);
  const textareaRef   = useRef(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Auto-save session whenever messages change
  useEffect(() => {
    if (messages.some(m => m.sender === 'user')) {
      const session = {
        id: sessionId,
        title: sessionTitle(messages),
        messages,
        createdAt: parseInt(sessionId.replace('sid_', '')),
        updatedAt: Date.now(),
      };
      saveSession(session);
      setSessions(loadSessions());
    }
  }, [messages, sessionId]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const watchedTitles = myList.filter(m => m.watched || m.status === 'watched').map(m => m.title).join(', ');

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userQuery = text.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userQuery }]);
    setLoading(true);
    try {
      // getSession() reads localStorage — no network call, never throws
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      // functions.invoke() is the correct Supabase way — handles CORS + auth properly
      const { data, error: fnError } = await supabase.functions.invoke('flick-scientist-bot', {
        body: { prompt: `My Library: ${watchedTitles}. User Message: ${userQuery}`, userId },
      });
      if (fnError) throw fnError;
      setMessages(prev => [...prev, {
        id: (Date.now()+1).toString(), sender: 'ai',
        text: data?.message || "My vision is a bit blurry. Try again?",
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(), sender: 'ai',
        text: "Something went wrong on my end — try again in a sec.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSyncSend = (prompt) => { setAiTab('chat'); sendMessage(prompt); };

  const startNewChat = () => {
    setSessionId('sid_' + Date.now());
    setMessages([WELCOME_MSG]);
    setAiTab('chat');
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const loadSession = (session) => {
    setSessionId(session.id);
    setMessages(session.messages);
    setAiTab('chat');
  };

  const removeSession = (e, id) => {
    e.stopPropagation();
    deleteSessionById(id);
    const updated = loadSessions();
    setSessions(updated);
    if (id === sessionId) startNewChat();
  };

  return (
    <div className="flex flex-col bg-[#0a0a0c] text-white" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between bg-[#121218] border-b border-white/5 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <Clapperboard size={16} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-black text-xs text-purple-400 tracking-[0.15em] uppercase leading-tight">FlickScient</h3>
            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-wider">Final Boss of Film</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex bg-[#0a0a0c] border border-white/5 rounded-xl p-0.5">
            <button onClick={() => setAiTab('chat')}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all ${aiTab==='chat' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-600 hover:text-gray-400'}`}>
              Chat
            </button>
            <button onClick={() => setAiTab('history')}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all flex items-center gap-1 ${aiTab==='history' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}>
              <Clock size={9} />History
            </button>
            <button onClick={() => setAiTab('sync')}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all flex items-center gap-1 ${aiTab==='sync' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}>
              <Users size={9} />Sync
            </button>
          </div>
          {aiTab === 'chat' && (
            <button onClick={startNewChat} title="New chat"
              className="text-gray-600 hover:text-purple-400 p-1.5 rounded-xl transition-all hover:bg-purple-500/10">
              <Plus size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── SYNC TAB ── */}
      {aiTab === 'sync' && <SyncRoom myList={myList} onSendToAI={handleSyncSend} />}

      {/* ── HISTORY TAB ── */}
      {aiTab === 'history' && (
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-1">
                <Clock size={26} className="text-amber-600" />
              </div>
              <p className="text-sm font-black text-gray-500">No chat history yet</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">Your conversations are saved automatically after each chat with FlickScient.</p>
              <button onClick={startNewChat} className="mt-2 flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-black px-4 py-2.5 rounded-xl text-sm hover:bg-purple-500/20 transition-all">
                <Plus size={14} /> Start a Chat
              </button>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black">
                  {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
                </p>
                <button onClick={startNewChat} className="flex items-center gap-1 text-[10px] text-purple-500 font-black hover:text-purple-400 transition-all">
                  <Plus size={11} /> New Chat
                </button>
              </div>
              <div className="space-y-2">
                {sessions.map(session => (
                  <button key={session.id} onClick={() => loadSession(session)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all group ${session.id === sessionId ? 'bg-purple-500/10 border-purple-500/30' : 'bg-[#111118] border-white/5 hover:border-purple-500/20 hover:bg-[#14141c]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold text-white truncate flex-1 leading-snug">{session.title}</p>
                      <button onClick={(e) => removeSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5 rounded flex-shrink-0 mt-0.5">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-[10px] text-gray-600">{fmtDate(session.updatedAt)}</p>
                      <span className="text-gray-700 text-[10px]">·</span>
                      <p className="text-[10px] text-gray-700">
                        {session.messages.filter(m => m.sender==='user').length} message{session.messages.filter(m=>m.sender==='user').length!==1?'s':''}
                      </p>
                      {session.id === sessionId && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-black ml-1">Active</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CHAT TAB ── */}
      {aiTab === 'chat' && <>
        {myList.length > 0 && (
          <div className="px-5 py-2 bg-[#0f0f14] border-b border-white/5 flex items-center gap-2 flex-shrink-0">
            <Sparkles size={11} className="text-purple-500 flex-shrink-0" />
            <p className="text-[10px] text-gray-600 truncate">
              <span className="text-purple-600 font-bold">{myList.filter(m=>m.watched||m.status==='watched').length} watched</span>
              {' '}· <span className="text-blue-600 font-bold">{myList.filter(m=>m.status==='watchlist').length} in watchlist</span>
              {' '}· recommendations exclude your library
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#0d0d12]">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender==='user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs border shadow-lg ${msg.sender==='user' ? 'bg-purple-500 border-purple-400 text-white font-black' : 'bg-[#16161d] border-purple-500/30 text-purple-400'}`}>
                {msg.sender==='user' ? <User size={15} /> : <Sparkles size={15} />}
              </div>
              <div className={`flex-1 p-4 rounded-2xl text-[13px] leading-relaxed border whitespace-pre-wrap select-text ${msg.sender==='user' ? 'bg-[#1a1a24] text-gray-100 border-white/5 font-medium rounded-tr-none ml-6' : 'bg-gradient-to-b from-[#121218] to-[#0f0f14] text-gray-200 border-white/5 rounded-tl-none mr-6 shadow-md'}`}>
                {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={i} className="text-yellow-400 font-black">{part.slice(2,-2)}</strong>
                    : part
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#16161d] border border-purple-500/30 flex items-center justify-center flex-shrink-0 text-purple-400">
                <Clapperboard size={15} className="animate-pulse" />
              </div>
              <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Mood Pills */}
        <div className="flex-shrink-0 bg-[#121218] border-t border-white/5 px-3 pt-3 pb-0">
          <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
            {MOOD_PILLS.map(pill => (
              <button key={pill.label} onClick={() => sendMessage(pill.prompt)} disabled={loading}
                className="flex-shrink-0 flex items-center gap-1.5 bg-[#1a1a26] border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-40">
                <span>{pill.emoji}</span><span>{pill.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="px-4 pb-4 bg-[#121218] flex-shrink-0">
          <form onSubmit={handleSend} className="relative flex items-end">
            <textarea ref={textareaRef} rows={1}
              placeholder="Challenge me with a vibe, genre, mood…"
              className="w-full bg-[#0a0a0c] text-white p-4 pr-14 rounded-2xl border border-gray-800 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-[13px] placeholder-gray-600 resize-none overflow-y-auto leading-relaxed"
              style={{ minHeight: '52px', maxHeight: '120px' }}
              value={input}
              onChange={e => { setInput(e.target.value); adjustHeight(); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !loading) {
                    sendMessage(input);
                    setInput('');
                    if (textareaRef.current) textareaRef.current.style.height = 'auto';
                  }
                }
              }}
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="absolute right-3 bottom-3 text-purple-400 hover:text-purple-300 disabled:opacity-30 transition-all p-2.5 rounded-xl hover:bg-purple-500/10">
              <Send size={18} strokeWidth={2.5} />
            </button>
          </form>
          <p className="text-[9px] text-gray-700 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
        </div>
      </>}
    </div>
  );
}
