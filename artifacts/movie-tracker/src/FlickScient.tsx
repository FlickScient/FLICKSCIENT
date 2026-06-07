// @ts-nocheck
import { supabase } from './lib/supabase';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Clapperboard, Link, Copy, Check, Users, ArrowLeft, Clock, Trash2, Plus, X, Star, Bookmark, Eye } from 'lucide-react';

// ─── TMDB helpers ─────────────────────────────────────────────────────────────
const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN as string;
const TMDB_HEAD  = { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } };
const tmdbFetch  = (path: string) => fetch(`https://api.themoviedb.org/3${path}`, TMDB_HEAD).then(r => r.json());
const TMDB_IMG   = (path: string, size = 'w500') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

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

// ─── Chat History Utils (Supabase — chat_sessions) ───────────────────────────

const MAX_SESSIONS = 20;

async function hashUserId(userId) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function sessionTitle(messages) {
  const first = messages.find(m => m.sender === 'user');
  if (!first) return 'New chat';
  return first.text.length > 50 ? first.text.slice(0, 50) + '…' : first.text;
}

async function loadSupabaseSessions(userId) {
  const hash = await hashUserId(userId);
  const { data } = await supabase
    .from('chat_sessions')
    .select('session_id, title, messages, updated_at')
    .eq('user_id_hash', hash)
    .order('updated_at', { ascending: false })
    .limit(MAX_SESSIONS);
  return (data || []).map(row => ({
    id: row.session_id,
    title: row.title || 'New chat',
    messages: row.messages || [],
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

async function saveSupabaseSession(userId, session, userEmail = '') {
  const hash = await hashUserId(userId);
  await supabase.from('chat_sessions').upsert({
    user_id_hash: hash,
    session_id:   session.id,
    title:        session.title,
    messages:     session.messages,
    updated_at:   new Date().toISOString(),
    user_email:   userEmail || null,
  }, { onConflict: 'user_id_hash,session_id' });
}
async function deleteSupabaseSession(userId, sessionId) {
  const hash = await hashUserId(userId);
  await supabase.from('chat_sessions')
    .delete().eq('user_id_hash', hash).eq('session_id', sessionId);
}

function fmtDate(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString('en',{weekday:'short'});
  return d.toLocaleDateString('en',{month:'short',day:'numeric'});
}

function parseBoldTitles(text) {
  const matches = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = regex.exec(text)) !== null) matches.push(m[1]);
  return [...new Set(matches)];
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

// ─── Movie Detail Sheet ───────────────────────────────────────────────────────
export function MovieDetailSheet({ title, onClose, myList = [] }) {
  const [movie,          setMovie]          = useState(null);
  const [busy,           setBusy]           = useState(true);
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [added,          setAdded]          = useState(null); // 'watchlist' | 'watched'
  const [rating,         setRating]         = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBusy(true); setMovie(null); setAdded(null); setRating(0); setBackdropLoaded(false);
    (async () => {
      try {
        // try movie first, then TV
        for (const mediaType of ['movie', 'tv']) {
          const key = mediaType === 'movie' ? 'title' : 'name';
          const src = await tmdbFetch(`/search/${mediaType}?query=${encodeURIComponent(title)}&page=1`);
          const hit = src.results?.[0];
          if (!hit) continue;
          const [det, cred] = await Promise.all([
            tmdbFetch(`/${mediaType}/${hit.id}?append_to_response=videos`),
            tmdbFetch(`/${mediaType}/${hit.id}/credits`),
          ]);
          if (!cancelled) setMovie({ ...det, mediaType, displayTitle: det[key] || title, cast: (cred.cast || []).slice(0, 8) });
          break;
        }
      } catch {}
      if (!cancelled) setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [title]);

  const save = async (status, watched) => {
    const t    = movie?.displayTitle || title;
    const year = (movie?.release_date || movie?.first_air_date || '').slice(0, 4);
    const { error } = await supabase.from('movies').insert({
      title: t,
      year: parseInt(year) || null,
      poster: movie?.poster_path ? TMDB_IMG(movie.poster_path) : null,
      genre: movie?.genres?.[0]?.name || null,
      tmdb_id: movie?.id || null,
      type: movie?.mediaType === 'tv' ? 'Series' : 'Movie',
      language: movie?.original_language || 'en',
      status,
      watched,
      rating: rating || null,
    });
    if (!error) setAdded(status);
  };

  const runtime = movie
    ? movie.runtime
      ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
      : movie.episode_run_time?.[0]
      ? `~${movie.episode_run_time[0]}m/ep`
      : null
    : null;

  const voteAvg = movie?.vote_average ? movie.vote_average.toFixed(1) : null;

  const existingEntry      = movie ? myList.find(m =>
    (movie.id && m.tmdb_id === movie.id) ||
    m.title?.toLowerCase() === movie.displayTitle?.toLowerCase()) : null;
  const alreadyWatched     = !!(existingEntry?.watched || existingEntry?.status === 'watched');
  const alreadyWatchlisted = existingEntry?.status === 'watchlist';

  return (
    <div className="fixed inset-0 z-[90] flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-h-[88vh] bg-[#111116] rounded-t-3xl overflow-y-auto z-10"
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}>

        {/* Backdrop / poster hero */}
        {busy ? (
          <div className="w-full h-48 bg-[#1a1a24] animate-pulse rounded-t-3xl" />
        ) : movie?.backdrop_path || movie?.poster_path ? (
          <div className="relative w-full h-52 flex-shrink-0">
            {!backdropLoaded && (
              <div className="absolute inset-0 bg-[#1a1a24] animate-pulse rounded-t-3xl z-10" />
            )}
            <img src={TMDB_IMG(movie.backdrop_path || movie.poster_path, 'w780')}
              alt="" className="w-full h-full object-cover rounded-t-3xl"
              onLoad={() => setBackdropLoaded(true)}
              onError={() => setBackdropLoaded(true)} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111116] via-[#111116]/50 to-transparent rounded-t-3xl" />
          </div>
        ) : (
          <div className="w-full h-24 bg-[#1a1a24] rounded-t-3xl" />
        )}

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 z-20">
          <X size={16} />
        </button>

        <div className="px-5 pb-10 -mt-10 relative z-10">
          {busy ? (
            <div className="space-y-3 pt-2">
              <div className="h-6 bg-white/5 rounded-xl w-3/4 animate-pulse" />
              <div className="h-4 bg-white/5 rounded-xl w-1/2 animate-pulse" />
              <div className="h-20 bg-white/5 rounded-xl animate-pulse mt-4" />
            </div>
          ) : !movie ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 text-sm">Couldn't find details for <span className="text-yellow-400 font-bold">"{title}"</span></p>
              <p className="text-gray-600 text-xs mt-1 mb-5">Not in TMDB — save it directly to your library.</p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const { error } = await supabase.from('movies').insert({ title, status: 'watchlist', watched: false });
                    if (!error) onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border font-black text-sm bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all active:scale-[0.98]">
                  <Bookmark size={14} fill="none" /> Watchlist
                </button>
                <button
                  onClick={async () => {
                    const { error } = await supabase.from('movies').insert({ title, status: 'watched', watched: true });
                    if (!error) onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border font-black text-sm bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all active:scale-[0.98]">
                  <Eye size={14} /> Watched
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Title + meta */}
              <h2 className="text-xl font-black text-white leading-tight mb-1">{movie.displayTitle}</h2>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {(movie.release_date || movie.first_air_date) && (
                  <span className="text-yellow-500 font-bold text-sm">
                    {(movie.release_date || movie.first_air_date).slice(0, 4)}
                  </span>
                )}
                {runtime && <><span className="text-gray-700">·</span><span className="text-gray-400 text-xs">{runtime}</span></>}
                <span className="text-gray-700">·</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {movie.mediaType === 'tv' ? 'Series' : 'Movie'}
                </span>
                {movie.genres?.[0] && (
                  <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-purple-900/60 text-purple-300">
                    {movie.genres[0].name}
                  </span>
                )}
                {voteAvg && (
                  <span className="flex items-center gap-1 text-xs text-yellow-500 font-bold ml-auto">
                    <Star size={11} fill="currentColor" /> {voteAvg}
                  </span>
                )}
              </div>

              {/* Overview */}
              {movie.overview && (
                <p className="text-gray-400 text-[13px] leading-relaxed mb-5">{movie.overview}</p>
              )}

              {/* Star rating */}
              {!added && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] text-gray-600 font-bold">Rate it:</span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRating(s === rating ? 0 : s)}
                        className={`transition-colors ${s <= rating ? 'text-yellow-500' : 'text-gray-700'} hover:text-yellow-400`}>
                        <Star size={18} fill={s <= rating ? 'currentColor' : 'none'} strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons — independently disabled by their own status */}
              <div className="flex gap-2">
                <button
                  onClick={() => !alreadyWatchlisted && added !== 'watchlist' && save('watchlist', false)}
                  disabled={alreadyWatchlisted || added === 'watchlist'}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-black text-sm transition-all active:scale-[0.98] ${
                    alreadyWatchlisted || added === 'watchlist'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 opacity-80 cursor-not-allowed'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                  }`}>
                  <Bookmark size={15} fill={alreadyWatchlisted || added === 'watchlist' ? 'currentColor' : 'none'} />
                  {alreadyWatchlisted || added === 'watchlist' ? '✓ Watchlist' : 'Watchlist'}
                </button>
                <button
                  onClick={() => !alreadyWatched && added !== 'watched' && save('watched', true)}
                  disabled={alreadyWatched || added === 'watched'}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-black text-sm transition-all active:scale-[0.98] ${
                    alreadyWatched || added === 'watched'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30 opacity-80 cursor-not-allowed'
                      : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                  }`}>
                  <Eye size={15} />
                  {alreadyWatched || added === 'watched' ? '✓ Watched' : 'Watched'}
                </button>
              </div>

              {/* Cast */}
              {movie.cast?.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-3">Cast</p>
                  <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {movie.cast.map(p => (
                      <div key={p.id} className="flex-shrink-0 text-center w-14">
                        <div className="w-14 h-14 rounded-2xl bg-[#1c1c26] border border-white/5 overflow-hidden mb-1">
                          {p.profile_path
                            ? <img src={TMDB_IMG(p.profile_path, 'w185')} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs font-black">{p.name[0]}</div>
                          }
                        </div>
                        <p className="text-[9px] text-gray-500 leading-tight truncate">{p.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const WELCOME_MESSAGES = [
  "Yo. I'm FlickScient — the Final Boss of film knowledge. I've mentally watched everything so you don't have to. Tell me your exact vibe right now and I'll drop something that'll rewire your brain. What are we feeling? 🎬",
  "Back again. Good taste recognized. What's the mood — something that hits, something that destroys you emotionally, or pure unhinged entertainment? I got all three. 🎥",
  "FlickScient online. Cinema IQ: maximum. Tell me what you actually want to feel right now and I'll give you the exact film that delivers it. No mid picks. 🍿",
  "Yo. You picked the right AI. I know every film ever made across every language, every era, every genre. What are we watching tonight? Drop me a vibe, a mood, a genre — anything. 🎭",
  "FlickScient here. No generic recs, no mid suggestions, no 'have you seen Inception?' energy. Tell me what you need and I'll find the film that actually fits. 🔥",
];

function randomWelcome() {
  return WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
}

function buildWelcomeText(name?: string | null): string {
  const hour = new Date().getHours();
  const timeStr =
    hour >= 0  && hour < 4  ? null          // moonlit — handled below
    : hour < 12              ? 'Good morning'
    : hour < 17              ? 'Good afternoon'
    : hour < 21              ? 'Good evening'
    :                          'Good night';

  if (name) {
    if (hour >= 0 && hour < 4) {
      const moonlit = [
        `Moonlit ${name}. Not sleeping either? Good — the best films hit different at this hour. What are we watching? 🌙`,
        `Moonlit ${name}. 4am cinema mode activated. I know exactly what this hour calls for. 🎬`,
        `Moonlit ${name}. The rest of the world is asleep. Let's find something that deserves the silence. 🌑`,
      ];
      return moonlit[Math.floor(Math.random() * moonlit.length)];
    }
    const vibes = [
      `${timeStr}, ${name}. FlickScient online — tell me what you're in the mood for and I'll find exactly the right film. 🎬`,
      `${timeStr}, ${name}. Back again? Good taste recognized. What are we watching? 🎥`,
      `${timeStr}, ${name}. FlickScient here — ready when you are. Drop a vibe, mood, or genre. 🍿`,
      `${timeStr}, ${name}. No mid picks, no generic recs. Tell me what you need. 🔥`,
    ];
    return vibes[Math.floor(Math.random() * vibes.length)];
  }
  // No name — still show time-based greeting
  const timeVibes: Record<string, string[]> = {
    morning: [
      "Good morning. FlickScient online — tell me what you're in the mood for and I'll find exactly the right film. 🎬",
      "Good morning. Back with the film energy already? Good taste. Drop a vibe, mood, or genre. ☕🎥",
    ],
    afternoon: [
      "Good afternoon. FlickScient here — no mid picks, no generic recs. What do you actually want to watch? 🍿",
      "Good afternoon. Cinema IQ: maximum. Tell me the exact vibe right now. 🎭",
    ],
    evening: [
      "Good evening. The best time for a great film — what are we watching tonight? 🔥",
      "Good evening. Tell me what you need and I'll find the film that actually fits. 🎬",
    ],
    night: [
      "Good night owl. Still going? Tell me your mood and I'll find something worth staying up for. 🌙",
      "Good night. Late-night cinema mode: the best films hit different now. What are we watching? 🎥",
    ],
    moonlit: [
      "Can't sleep? Neither can I. Perfect — the best films live at this hour. What are we watching? 🌑",
      "4am cinema mode. I know exactly what this hour calls for. Tell me your mood. 🌙",
    ],
  };
  const bucket = hour < 4 ? 'moonlit' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  const pool = timeVibes[bucket];
  return pool[Math.floor(Math.random() * pool.length)];
}

const WELCOME_MSG = {
  id: 'welcome', sender: 'ai',
  text: buildWelcomeText(null),
};

async function searchAndGetTmdbData(title) {
  try {
    for (const mediaType of ['movie', 'tv']) {
      const key = mediaType === 'movie' ? 'title' : 'name';
      const src = await tmdbFetch(`/search/${mediaType}?query=${encodeURIComponent(title)}&page=1`);
      const hit = src.results?.[0];
      if (!hit) continue;
      const det = await tmdbFetch(`/${mediaType}/${hit.id}`);
      return {
        poster: det.poster_path ? TMDB_IMG(det.poster_path, 'w500') : null,
        year: parseInt((det.release_date || det.first_air_date || '').slice(0, 4)) || null,
        genre: det.genres?.[0]?.name || null,
        tmdb_id: det.id || null,
        type: mediaType === 'tv' ? 'Series' : 'Movie',
        language: det.original_language || 'en',
        displayTitle: det[key] || title,
      };
    }
  } catch {}
  return null;
}

export default function FlickScient({ myList,onLibraryUpdate }) {
  const [messages,       setMessages]       = useState([WELCOME_MSG]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [isStreaming,    setIsStreaming]     = useState(false);
  const [aiTab,          setAiTab]          = useState('chat');
  const [toast,          setToast]          = useState('');
  const [sessionId,      setSessionId]      = useState(() => crypto.randomUUID());
  const [sessions,       setSessions]       = useState([]);
  const [selectedMovie,  setSelectedMovie]  = useState(null);
  const [countdown,      setCountdown]      = useState(0);
  const chatBottomRef    = useRef(null);
  const textareaRef      = useRef(null);
  const currentUserIdRef = useRef(null);
  const countdownRef     = useRef(null);
  const nicknameRef      = useRef(null);
  const userEmailRef     = useRef('');

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Load sessions from Supabase on mount
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      currentUserIdRef.current = session.user.id;
      userEmailRef.current = session.user.email || '';
      const loaded = await loadSupabaseSessions(session.user.id);
      setSessions(loaded);
    })();
  }, []);

  // Fetch nickname and personalize greeting
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const hashed = await hashUserId(session.user.id);
      const { data } = await supabase
        .from('flickscient_users')
       .select('nickname, name')
.eq('user_id_hash', hashed)
.maybeSingle();
const name = data?.nickname || data?.name;
      if (name) {
        nicknameRef.current = name;
        setMessages(prev => {
          if (prev.length === 1 && prev[0].id === 'welcome') {
            return [{ id: 'welcome', sender: 'ai', text: buildWelcomeText(name) }];
          }
          return prev;
        });
      }
    })();
  }, []);

  // Save to Supabase only after streaming completes (isStreaming → false triggers this)
  useEffect(() => {
    if (isStreaming) return;
    if (!messages.some(m => m.sender === 'user')) return;
    const userId = currentUserIdRef.current;
    if (!userId) return;
    const sess = { id: sessionId, title: sessionTitle(messages), messages };
    saveSupabaseSession(userId, sess, userEmailRef.current).catch(() => {});
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      return [{ ...sess, updatedAt: Date.now() }, ...filtered].slice(0, MAX_SESSIONS);
    });
  }, [messages, sessionId, isStreaming]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const watchedTitles   = myList.filter(m => m.watched || m.status === 'watched').map(m => m.title).join(', ');
  const watchlistTitles = myList.filter(m => m.status === 'watchlist').map(m => m.title).join(', ');

  const sendMessage = async (text) => {
    if (!text.trim() || loading || countdown > 0) return;
    const userQuery = text.trim();
    const conversationHistory = messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', content: m.text }));
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userQuery }]);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      if (userId) currentUserIdRef.current = userId;
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flick-scientist-bot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            prompt: userQuery,
            userId,
            sessionId,
            conversationHistory,
            watched: watchedTitles || '',
            watchlist: watchlistTitles || '',
            userLocalHour: new Date().getHours(),
            userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            nickname: nicknameRef.current || '',
          }),
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.retryAfter > 0) {
          let secs = Math.ceil(errData.retryAfter);
          setCountdown(secs);
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = setInterval(() => {
            secs -= 1;
            setCountdown(secs);
            if (secs <= 0) { clearInterval(countdownRef.current); countdownRef.current = null; }
          }, 1000);
        }
        throw new Error(errData.message || `Request failed (${response.status})`);
      }
      const msgId = String(Date.now() + 1);
      setLoading(false);
      setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: '' }]);
      setIsStreaming(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        // Strip <action> tags from display in real-time (including partial tags mid-stream)
        const displayText = fullText
          .replace(/<action>[\s\S]*?<\/action>/g, '')
          .replace(/<action>[\s\S]*$/, '')
          .trim();
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: displayText } : m));
      }

     // ── Parse AI action tags (handles multiple) ────────────────────────────
const actionMatches = [...fullText.matchAll(/<action>([\s\S]*?)<\/action>/gi)];
const cleanText = fullText.replace(/<action>[\s\S]*?<\/action>/g, '').trim();
if (actionMatches.length > 0) {
  setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: cleanText } : m));
  const userId = currentUserIdRef.current;
if (userId) {
    let insertedTitles = [];
    let skippedTitles = [];
    for (const match of actionMatches) {
      try {
        const actionData = JSON.parse(match[1].trim());
        const isWatched = actionData.type === 'add_watched';
        const actionTitle = (actionData.title || '').trim();
        if (!actionTitle) continue;
        if (actionData.type !== 'add_watchlist' && actionData.type !== 'add_watched') continue;
        const { data: dup } = await supabase.from('movies').select('id')..eq('user_id', userId).ilike('title', actionTitle).maybeSingle();
        if (dup) { skippedTitles.push(actionTitle); continue; }
        const meta = await searchAndGetTmdbData(actionTitle);
        const { error: insertErr } = await supabase.from('movies').insert({
          user_id: userId,
          title: meta?.displayTitle || actionTitle,
          status: isWatched ? 'watched' : 'watchlist',
          watched: isWatched,
          poster: meta?.poster || null,
          year: meta?.year || null,
          genre: meta?.genre || null,
          tmdb_id: meta?.tmdb_id || null,
          type: meta?.type || 'Movie',
          language: meta?.language || 'en',
        });
        if (!insertErr) insertedTitles.push(actionTitle);
      } catch {}
    }
    if (insertedTitles.length > 0) {
      setTimeout(() => onLibraryUpdate?.(), 500);
      setToast(`✓ Added ${insertedTitles.length} film${insertedTitles.length > 1 ? 's' : ''} to watchlist`);
      setTimeout(() => setToast(''), 3500);
    } else if (skippedTitles.length > 0) {
      setToast(`Already in your library`);
      setTimeout(() => setToast(''), 3500);
    }
  }
}
      // Fallback: if no action tag, detect intent directly from user message
if (actionMatches.length === 0) {
  const wlMatch = userQuery.match(/(?:add|save)\s+(.+?)\s+(?:to\s+(?:my\s+)?(?:watchlist|library)|for\s+later)/i);
  const wdMatch = userQuery.match(/(?:mark\s+(.+?)\s+as\s+watched|i\s+(?:just\s+)?(?:watched|saw|finished)\s+(.+))/i);
  const fallbackTitle = (wlMatch?.[1] || wdMatch?.[1] || wdMatch?.[2] || '').trim();
  const fallbackIsWatched = !!wdMatch;
  if (fallbackTitle) {
    const { data: { session: authSess } } = await supabase.auth.getSession();
    if (authSess?.user) {
      const { data: dup } = await supabase.from('movies').select('id').eq('user_id', authSess.user.id).ilike('title', fallbackTitle).maybeSingle();
      if (!dup) {
        const meta = await searchAndGetTmdbData(fallbackTitle);
        const { error: insertError } = await supabase.from('movies').insert({
          user_id: authSess.user.id,
          title: meta?.displayTitle || fallbackTitle,
          status: fallbackIsWatched ? 'watched' : 'watchlist',
          watched: fallbackIsWatched,
          poster: meta?.poster || null,
          year: meta?.year || null,
          genre: meta?.genre || null,
          tmdb_id: meta?.tmdb_id || null,
          type: meta?.type || 'Movie',
          language: meta?.language || 'en',
        });
         if (insertError) {
  setToast(`Failed: ${insertError.message}`);
  setTimeout(() => setToast(''), 5000);
  return;
}  
        setTimeout(() => onLibraryUpdate?.(), 500);
        setToast(fallbackIsWatched ? `✓ Marked "${fallbackTitle}" as watched` : `✓ Added "${fallbackTitle}" to watchlist`);
        setTimeout(() => setToast(''), 3500);
      } else {
        setToast(`"${fallbackTitle}" is already in your library`);
        setTimeout(() => setToast(''), 3500);
      }
    }
  }
}
      
      setIsStreaming(false);
    } catch (error) {
      let errMsg = "Connection dropped — try again in a sec 🎬";
      if (error?.message && !error.message.toLowerCase().includes('failed to fetch')) {
        errMsg = error.message;
      }
      setLoading(false);
      setIsStreaming(false);
      setMessages(prev => [...prev, { id: 'err-' + Date.now(), sender: 'ai', text: errMsg }]);
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
    setSessionId(crypto.randomUUID());
    setMessages([{ id: 'welcome', sender: 'ai', text: buildWelcomeText(nicknameRef.current) }]);
    setAiTab('chat');
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const loadSession = (session) => {
    setSessionId(session.id);
    setMessages(session.messages);
    setAiTab('chat');
  };

  const removeSession = async (e, id) => {
    e.stopPropagation();
    const userId = currentUserIdRef.current;
    if (userId) deleteSupabaseSession(userId, id).catch(() => {});
    setSessions(prev => prev.filter(s => s.id !== id));
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
          {messages.map(msg => {
            const isAdminMsg = msg.sender === 'ai' && msg.text.startsWith('⚙️ [ADMIN]');
            const adminDetail = isAdminMsg ? msg.text.replace('⚙️ [ADMIN]', '').trim() : '';
            if (isAdminMsg) return (
              <div key={msg.id} className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-[12px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-400 font-black uppercase tracking-widest text-[9px]">⚙️ Admin — Config Error</span>
                </div>
                <p className="text-red-300 leading-relaxed">{adminDetail}</p>
              </div>
            );
            return (
            <div key={msg.id}>
              <div className={`flex items-start gap-3 ${msg.sender==='user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs border shadow-lg ${msg.sender==='user' ? 'bg-purple-500 border-purple-400 text-white font-black' : 'bg-[#16161d] border-purple-500/30 text-purple-400'}`}>
                  {msg.sender==='user' ? <User size={15} /> : <Sparkles size={15} />}
                </div>
                <div className={`flex-1 p-4 rounded-2xl text-[13px] leading-relaxed border select-text ${msg.sender==='user' ? 'bg-[#1a1a24] text-gray-100 border-white/5 font-medium rounded-tr-none ml-6' : 'bg-gradient-to-b from-[#121218] to-[#0f0f14] text-gray-200 border-white/5 rounded-tl-none mr-6 shadow-md'}`}>
                  {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      const title = part.slice(2, -2);
                      const alreadySaved = myList.some(m => m.title?.toLowerCase() === title.toLowerCase());
                      return (
                        <span key={i} className="inline-flex items-center gap-1 align-middle">
                          <button onClick={() => setSelectedMovie(title)}
                            className="text-yellow-400 font-black hover:text-yellow-300 hover:underline underline-offset-2 transition-colors cursor-pointer">
                            {title}
                          </button>
                          {msg.sender === 'ai' && (
                            <button
                              title={alreadySaved ? 'Already in library' : 'Add to Watchlist'}
                              onClick={async () => {
                                if (alreadySaved) return;
                                const { data: { session: s } } = await supabase.auth.getSession();
                                if (!s?.user) return;
                                const { data: dup } = await supabase.from('movies').select('id').eq('user_id', s.user.id).ilike('title', title.trim()).maybeSingle();
                                if (dup) return;
                                const meta = await searchAndGetTmdbData(title);
                                await supabase.from('movies').insert({
                                  user_id: s.user.id,
                                  title: meta?.displayTitle || title,
                                  status: 'watchlist',
                                  watched: false,
                                  poster: meta?.poster || null,
                                  year: meta?.year || null,
                                  genre: meta?.genre || null,
                                  tmdb_id: meta?.tmdb_id || null,
                                  type: meta?.type || 'Movie',
                                  language: meta?.language || 'en',
                                });
                                setToast(`✓ Added "${title}" to watchlist`);
                                setTimeout(() => setToast(''), 3500);
                              }}
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${alreadySaved ? 'text-blue-400' : 'text-gray-600 hover:text-blue-400 hover:bg-blue-900/30'}`}>
                              <Bookmark size={11} fill={alreadySaved ? 'currentColor' : 'none'} />
                            </button>
                          )}
                        </span>
                      );
                    }
                    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
                  })}
                </div>
              </div>
            </div>
            );
          })}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#16161d] border border-purple-500/30 flex items-center justify-center flex-shrink-0 text-purple-400">
                <Clapperboard size={15} className="animate-pulse" />
              </div>
              <div className="bg-gradient-to-b from-[#121218] to-[#0f0f14] border border-white/5 px-4 py-3.5 rounded-2xl rounded-tl-none flex items-center gap-3 mr-6 shadow-md">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDuration: '1s' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDuration: '1s', animationDelay: '0.18s' }} />
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDuration: '1s', animationDelay: '0.36s' }} />
                </div>
                <span className="text-[11px] text-gray-600 tracking-wide">Thinking…</span>
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
                className="flex-shrink-0 flex items-center gap-1.5 bg-amber-950/50 border border-amber-800/40 hover:border-amber-600/50 hover:bg-amber-900/40 text-amber-400 hover:text-amber-200 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-40">
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
            <button type="submit" disabled={loading || !input.trim() || countdown > 0}
              className="absolute right-3 bottom-3 text-purple-400 hover:text-purple-300 disabled:opacity-30 transition-all p-2.5 rounded-xl hover:bg-purple-500/10">
              <Send size={18} strokeWidth={2.5} />
            </button>
          </form>
          {countdown > 0
            ? <p className="text-[9px] text-amber-500 font-bold text-center mt-1.5">Try again in {countdown}s…</p>
            : <p className="text-[9px] text-gray-700 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
          }
          <p className="text-[9px] text-gray-700/60 text-center mt-1">FlickScient can make mistakes — verify important info</p>
        </div>
      </>}

      {selectedMovie && (
        <MovieDetailSheet title={selectedMovie} onClose={() => setSelectedMovie(null)} myList={myList} />
      )}

      {/* ── AI Action Toast ── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          style={{ animation: 'fadeInUp 0.25s ease' }}>
          <div className="bg-[#1a1a24] border border-white/10 text-white text-[12px] font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 whitespace-nowrap">
            <span className="text-green-400">{toast}</span>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </div>
  );
}
