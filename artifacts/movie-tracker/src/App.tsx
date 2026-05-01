// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search, Heart, CheckCircle, LogOut, Plus, ArrowUp,
  Film, X, Trash2, Star, Globe, Users, SlidersHorizontal,
  ChevronRight, BarChart2, Clock, Zap, Award, Download,
} from 'lucide-react';

// ─── Config ──────────────────────────────────────────────────────────────────
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTA1NDM4MWYzY2M2NGY1ZjllNmVkNjVlMjIwNzgzYiIsIm5iZiI6MTc3NzU2MzkzNy4zMzIsInN1YiI6IjY5ZjM3OTIxZWFjNjM3MmZmYjBlNjAyNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.YgTiOJcH5eCqqrc3uWg6CvTNbvCa5UNzy4jpaeQ6zXs";
const SUPABASE_URL = "https://rcdjmzxiectkckufyqyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZGptenhpZWN0a2NrdWZ5cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjcxOTMsImV4cCI6MjA5MzE0MzE5M30.TNFfE6RDV4MX3H-M8zA-h72lux4Mgdd9srqDFJAJHnE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Constants ────────────────────────────────────────────────────────────────
const TMDB_GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action',
  10762: 'Kids', 10765: 'Sci-Fi', 10768: 'War',
};

const GENRE_ID_MAP = {
  Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
  Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36,
  Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749, 'Sci-Fi': 878,
  Thriller: 53, War: 10752, Western: 37,
};

const GENRE_ICONS = {
  Action: '💥', Adventure: '🗺️', Animation: '🎨', Comedy: '😂',
  Crime: '🔫', Documentary: '🎙️', Drama: '🎭', Family: '👨‍👩‍👧',
  Fantasy: '🧙', History: '📜', Horror: '👻', Music: '🎵',
  Mystery: '🔍', Romance: '💕', 'Sci-Fi': '🚀', Thriller: '😱',
  War: '⚔️', Western: '🤠',
};

const INDUSTRIES = [
  { label: 'Hollywood', lang: 'en', flag: '🇺🇸', color: 'from-blue-900/60 to-blue-800/40', bar: '#3b82f6' },
  { label: 'Bollywood', lang: 'hi', flag: '🇮🇳', color: 'from-orange-900/60 to-orange-800/40', bar: '#f97316' },
  { label: 'Korean',    lang: 'ko', flag: '🇰🇷', color: 'from-red-900/60 to-red-800/40',    bar: '#ef4444' },
  { label: 'Japanese',  lang: 'ja', flag: '🇯🇵', color: 'from-rose-900/60 to-rose-800/40',  bar: '#f43f5e' },
  { label: 'Chinese',   lang: 'zh', flag: '🇨🇳', color: 'from-red-900/60 to-yellow-900/40', bar: '#eab308' },
  { label: 'French',    lang: 'fr', flag: '🇫🇷', color: 'from-indigo-900/60 to-indigo-800/40', bar: '#6366f1' },
  { label: 'Spanish',   lang: 'es', flag: '🇪🇸', color: 'from-yellow-900/60 to-red-900/40', bar: '#a855f7' },
];

const LANG_TO_INDUSTRY = {
  en: 'Hollywood', hi: 'Bollywood', ko: 'Korean',
  ja: 'Japanese', zh: 'Chinese', fr: 'French', es: 'Spanish',
  pt: 'International', it: 'International', de: 'International',
};

const GENRE_COLORS = {
  Action:      'bg-red-900/60 text-red-300',
  Adventure:   'bg-orange-900/60 text-orange-300',
  Animation:   'bg-purple-900/60 text-purple-300',
  Comedy:      'bg-yellow-900/60 text-yellow-300',
  Crime:       'bg-amber-800/60 text-amber-300',
  Documentary: 'bg-teal-900/60 text-teal-300',
  Drama:       'bg-green-900/60 text-green-300',
  Family:      'bg-pink-900/60 text-pink-300',
  Fantasy:     'bg-violet-900/60 text-violet-300',
  History:     'bg-stone-700/60 text-stone-300',
  Horror:      'bg-red-950/80 text-red-400',
  Music:       'bg-indigo-900/60 text-indigo-300',
  Mystery:     'bg-blue-900/60 text-blue-300',
  Romance:     'bg-rose-900/60 text-rose-300',
  'Sci-Fi':    'bg-cyan-900/60 text-cyan-300',
  Thriller:    'bg-orange-950/60 text-orange-300',
  War:         'bg-gray-800/60 text-gray-300',
  Western:     'bg-yellow-950/60 text-yellow-600',
  default:     'bg-gray-800/60 text-gray-400',
};

function genreColor(g) { return GENRE_COLORS[g] || GENRE_COLORS.default; }
function detectIndustry(lang) { return LANG_TO_INDUSTRY[lang] || null; }
const TMDB_HEADERS = { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } };

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (type) => {
    setLoading(true);
    const { error } = type === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#16161d] p-8 rounded-3xl border border-white/5 shadow-2xl text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-2 font-black">The Ultimate Canon</p>
        <h2 className="text-3xl font-black text-yellow-500 mb-2">Movie Sync</h2>
        <p className="text-xs text-gray-600 mb-8">Your personal masterpiece tracker</p>
        <p className="text-[10px] text-gray-700 mb-6 -mt-4">
          Made by <span className="text-yellow-700 font-bold">Mahmudul Hasan Mahid</span>
        </p>
        <input type="email" placeholder="Email"
          className="w-full bg-[#0a0a0c] p-4 rounded-xl mb-4 border border-gray-800 outline-none focus:border-yellow-500/50 transition-colors text-sm"
          onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password"
          className="w-full bg-[#0a0a0c] p-4 rounded-xl mb-6 border border-gray-800 outline-none focus:border-yellow-500/50 transition-colors text-sm"
          onChange={e => setPassword(e.target.value)} />
        <div className="flex gap-3">
          <button onClick={() => handleAuth('login')} disabled={loading}
            className="flex-1 bg-yellow-500 text-black font-bold py-4 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50">Login</button>
          <button onClick={() => handleAuth('signup')} disabled={loading}
            className="flex-1 bg-white/5 text-white font-bold py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50">Sign Up</button>
        </div>
      </div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ item, mediaType, added, onAdd }) {
  const title = item.title || item.name;
  const year  = (item.release_date || item.first_air_date || '').split('-')[0];
  const genre = item.genre_ids?.[0] ? TMDB_GENRES[item.genre_ids[0]] : null;
  const type  = mediaType || (item.media_type === 'tv' ? 'Series' : 'Movie');

  return (
    <div className="flex bg-[#16161d] p-3 rounded-2xl gap-3 border border-white/5 items-center">
      {item.poster_path ? (
        <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
          className="w-12 h-[72px] object-cover rounded-xl flex-shrink-0" alt="" />
      ) : (
        <div className="w-12 h-[72px] bg-[#1c1c26] rounded-xl flex items-center justify-center flex-shrink-0">
          <Film size={16} className="text-gray-700" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm leading-snug truncate">{title}</h3>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {year && <span className="text-xs text-yellow-600 font-bold">{year}</span>}
          <span className="text-[9px] text-gray-600 uppercase tracking-wide">{type}</span>
          {genre && <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${genreColor(genre)}`}>{genre}</span>}
        </div>
      </div>
      <button onClick={() => !added && onAdd(item, type)}
        className={`flex-shrink-0 text-[10px] font-black px-3 py-2 rounded-xl transition-all ${
          added ? 'bg-green-900/40 text-green-400' : 'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95'
        }`}>
        {added ? '✓' : '+'}
      </button>
    </div>
  );
}

// ─── Search / Add Page ────────────────────────────────────────────────────────
function SearchPage({ onBack, onAdded, existingTitles }) {
  const [tab, setTab] = useState('discover');
  const [added, setAdded] = useState(new Set());

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [activeBrowse, setActiveBrowse] = useState(null);
  const [browsePage, setBrowsePage] = useState(1);

  const [dirQuery, setDirQuery] = useState('');
  const [dirResults, setDirResults] = useState([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [selectedDir, setSelectedDir] = useState(null);
  const [dirMovies, setDirMovies] = useState([]);
  const [dirMoviesLoading, setDirMoviesLoading] = useState(false);

  // Discover
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const isAdded = (item) => added.has(item.id) || existingTitles.has((item.title || item.name || '').toLowerCase());

  useEffect(() => {
    if (tab === 'discover' && !trendingLoaded) loadTrending();
  }, [tab]);

  const loadTrending = async () => {
    setTrendingLoading(true);
    try {
      const [movRes, tvRes] = await Promise.all([
        fetch('https://api.themoviedb.org/3/trending/movie/day?page=1', TMDB_HEADERS),
        fetch('https://api.themoviedb.org/3/trending/tv/day?page=1', TMDB_HEADERS),
      ]);
      const [movData, tvData] = await Promise.all([movRes.json(), tvRes.json()]);
      const movs = (movData.results || []).map(m => ({ ...m, _mediaType: 'Movie' }));
      const tvs  = (tvData.results  || []).map(m => ({ ...m, _mediaType: 'Series' }));
      const merged = [...movs, ...tvs].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      setTrending(merged);
      setTrendingLoaded(true);
    } catch (_) {}
    setTrendingLoading(false);
  };

  const addToLibrary = async (item, type) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('You must be logged in.'); return; }
    const genre    = item.genre_ids?.[0] ? TMDB_GENRES[item.genre_ids[0]] || null : null;
    const industry = detectIndustry(item.original_language);
    const { data: inserted, error } = await supabase.from('movies').insert([{
      user_id: user.id,
      title:   item.title || item.name,
      year:    (item.release_date || item.first_air_date || '').split('-')[0],
      type:    type || (item.media_type === 'tv' ? 'Series' : 'Movie'),
      poster:  item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
      watched: false, favorite: false,
    }]).select('id').single();
    if (error) { alert('Could not add: ' + error.message); return; }
    if (inserted?.id) {
      const extras = {};
      if (genre)    extras.genre    = genre;
      if (industry) extras.industry = industry;
      if (Object.keys(extras).length) await supabase.from('movies').update(extras).eq('id', inserted.id);
    }
    setAdded(prev => new Set([...prev, item.id]));
    onAdded();
  };

  const doSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true);
    const res = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false`, TMDB_HEADERS);
    const data = await res.json();
    setSearchResults((data.results || []).filter(r => r.media_type !== 'person'));
    setSearchLoading(false);
  };

  const browseGenre = async (genreName, page = 1) => {
    const genreId = GENRE_ID_MAP[genreName];
    setActiveBrowse({ type: 'genre', label: genreName });
    setBrowseLoading(true); setBrowsePage(page);
    if (page === 1) setBrowseResults([]);
    const res = await fetch(`https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&sort_by=vote_count.desc&page=${page}`, TMDB_HEADERS);
    const data = await res.json();
    if (page === 1) setBrowseResults(data.results || []);
    else setBrowseResults(prev => [...prev, ...(data.results || [])]);
    setBrowseLoading(false);
  };

  const browseIndustry = async (industry, page = 1) => {
    setActiveBrowse({ type: 'industry', label: industry.label, lang: industry.lang });
    setBrowseLoading(true); setBrowsePage(page);
    if (page === 1) setBrowseResults([]);
    const res = await fetch(`https://api.themoviedb.org/3/discover/movie?with_original_language=${industry.lang}&sort_by=vote_count.desc&page=${page}`, TMDB_HEADERS);
    const data = await res.json();
    if (page === 1) setBrowseResults(data.results || []);
    else setBrowseResults(prev => [...prev, ...(data.results || [])]);
    setBrowseLoading(false);
  };

  const searchDirector = async (e) => {
    e.preventDefault();
    if (!dirQuery.trim()) return;
    setDirLoading(true); setSelectedDir(null); setDirMovies([]);
    const res = await fetch(`https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(dirQuery)}`, TMDB_HEADERS);
    const data = await res.json();
    setDirResults((data.results || []).slice(0, 6));
    setDirLoading(false);
  };

  const loadDirectorFilms = async (person) => {
    setSelectedDir(person); setDirMoviesLoading(true); setDirMovies([]);
    const res = await fetch(`https://api.themoviedb.org/3/person/${person.id}/combined_credits`, TMDB_HEADERS);
    const data = await res.json();
    const directed = (data.crew || []).filter(c => c.job === 'Director' && c.poster_path)
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    setDirMovies(directed); setDirMoviesLoading(false);
  };

  const TABS = [
    { id: 'discover', icon: <Zap size={15} />,     label: 'Hot' },
    { id: 'search',   icon: <Search size={15} />,  label: 'Search' },
    { id: 'genre',    icon: <Film size={15} />,     label: 'Genre' },
    { id: 'industry', icon: <Globe size={15} />,    label: 'Industry' },
    { id: 'director', icon: <Users size={15} />,    label: 'Director' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-10">
      <div className="pt-10 pb-4 px-5 bg-[#0f0f13] border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors"><X size={22} /></button>
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-gray-500">The Ultimate Canon</p>
            <h2 className="text-lg font-black">Add Films</h2>
          </div>
        </div>
        <div className="flex gap-1 bg-[#111116] p-1 rounded-2xl overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setActiveBrowse(null); setBrowseResults([]); }}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black transition-all ${
                tab === t.id ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Discover tab */}
      {tab === 'discover' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-black">Trending Today</p>
              <p className="text-[10px] text-gray-700 mt-0.5">Updated daily · Movies & Series</p>
            </div>
            <button onClick={() => { setTrendingLoaded(false); loadTrending(); }}
              className="text-[10px] text-yellow-600 font-bold border border-yellow-600/30 px-3 py-1.5 rounded-full hover:bg-yellow-500/10 transition-colors">
              Refresh
            </button>
          </div>

          {trendingLoading && (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex bg-[#16161d] p-3 rounded-2xl gap-3 border border-white/5 items-center animate-pulse">
                  <div className="w-12 h-[72px] bg-[#1c1c26] rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#1c1c26] rounded w-3/4" />
                    <div className="h-2 bg-[#1c1c26] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!trendingLoading && trending.length > 0 && (
            <>
              {/* Rank 1 hero card */}
              {(() => {
                const hero = trending[0];
                const heroTitle = hero.title || hero.name;
                const heroYear = (hero.release_date || hero.first_air_date || '').split('-')[0];
                const heroGenre = hero.genre_ids?.[0] ? TMDB_GENRES[hero.genre_ids[0]] : null;
                const heroAdded = isAdded(hero);
                return (
                  <div className="relative rounded-3xl overflow-hidden mb-4 border border-white/10">
                    {hero.backdrop_path && (
                      <img src={`https://image.tmdb.org/t/p/w780${hero.backdrop_path}`}
                        className="w-full h-40 object-cover" alt="" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                      <div>
                        <div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">🔥 #1 Trending</div>
                        <p className="text-base font-black text-white leading-tight">{heroTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {heroYear && <span className="text-xs text-yellow-400 font-bold">{heroYear}</span>}
                          {heroGenre && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${genreColor(heroGenre)}`}>{heroGenre}</span>}
                        </div>
                      </div>
                      <button onClick={() => !heroAdded && addToLibrary(hero, hero._mediaType)}
                        className={`flex-shrink-0 text-xs font-black px-4 py-2.5 rounded-xl transition-all ${
                          heroAdded ? 'bg-green-900/60 text-green-400' : 'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95'
                        }`}>
                        {heroAdded ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Rest of trending */}
              <div className="space-y-3">
                {trending.slice(1).map((item, i) => (
                  <div key={item.id} className="flex bg-[#16161d] p-3 rounded-2xl gap-3 border border-white/5 items-center">
                    <span className="text-[11px] font-black text-gray-700 w-5 text-center flex-shrink-0">#{i+2}</span>
                    {item.poster_path
                      ? <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} className="w-11 h-[66px] object-cover rounded-xl flex-shrink-0" alt="" />
                      : <div className="w-11 h-[66px] bg-[#1c1c26] rounded-xl flex-shrink-0 flex items-center justify-center"><Film size={14} className="text-gray-700" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.title || item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-yellow-600 font-bold">{(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                        <span className="text-[9px] text-gray-600 uppercase">{item._mediaType}</span>
                        {item.vote_average > 0 && <span className="text-[9px] text-gray-600">⭐ {item.vote_average.toFixed(1)}</span>}
                      </div>
                    </div>
                    <button onClick={() => !isAdded(item) && addToLibrary(item, item._mediaType)}
                      className={`flex-shrink-0 text-[10px] font-black px-3 py-2 rounded-xl transition-all ${
                        isAdded(item) ? 'bg-green-900/40 text-green-400' : 'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95'
                      }`}>
                      {isAdded(item) ? '✓' : '+'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search tab */}
      {tab === 'search' && (
        <div className="p-4">
          <form onSubmit={doSearch} className="relative mb-4">
            <Search className="absolute left-4 top-4 text-gray-500" size={18} />
            <input type="text" placeholder="Search movies or series..." value={query} onChange={e => setQuery(e.target.value)}
              className="w-full bg-[#1c1c26] p-4 pl-11 pr-16 rounded-2xl border border-gray-800 outline-none focus:border-yellow-500/60 text-sm transition-colors" />
            <button type="submit" className="absolute right-3 top-2.5 bg-yellow-500 text-black text-xs font-black px-3 py-1.5 rounded-xl">Go</button>
          </form>
          {searchLoading && <p className="text-center text-gray-500 text-sm py-8">Searching…</p>}
          <div className="space-y-3">
            {searchResults.map(item => (
              <ResultCard key={item.id} item={item} added={isAdded(item)} onAdd={addToLibrary} />
            ))}
          </div>
          {!searchLoading && searchResults.length === 0 && query && (
            <p className="text-center text-gray-600 text-sm py-10">No results found</p>
          )}
        </div>
      )}

      {/* Genre tab */}
      {tab === 'genre' && (
        <div className="p-4">
          {!activeBrowse ? (
            <>
              <p className="text-xs text-gray-600 mb-4 uppercase tracking-widest font-black">Pick a Genre</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(GENRE_ICONS).map(([genre, icon]) => (
                  <button key={genre} onClick={() => browseGenre(genre)}
                    className="bg-[#16161d] border border-white/5 rounded-2xl p-4 text-center hover:border-yellow-500/40 hover:bg-[#1c1c26] transition-all active:scale-95">
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-[11px] font-black text-gray-300">{genre}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { setActiveBrowse(null); setBrowseResults([]); }}
                  className="text-gray-400 hover:text-white text-xs font-bold">← Back</button>
                <span className="text-sm font-black">{GENRE_ICONS[activeBrowse.label]} {activeBrowse.label}</span>
              </div>
              {browseLoading && browseResults.length === 0 && <p className="text-center text-gray-500 text-sm py-8">Loading…</p>}
              <div className="space-y-3">
                {browseResults.map(item => (
                  <ResultCard key={item.id} item={item} mediaType="Movie" added={isAdded(item)} onAdd={(i) => addToLibrary(i, 'Movie')} />
                ))}
              </div>
              {browseResults.length > 0 && (
                <button onClick={() => browseGenre(activeBrowse.label, browsePage + 1)} disabled={browseLoading}
                  className="w-full mt-4 py-3 bg-[#1c1c26] text-gray-400 text-xs font-black rounded-2xl border border-white/10 hover:bg-[#2c2c3a] transition-colors disabled:opacity-50">
                  {browseLoading ? 'Loading…' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Industry tab */}
      {tab === 'industry' && (
        <div className="p-4">
          {!activeBrowse ? (
            <>
              <p className="text-xs text-gray-600 mb-4 uppercase tracking-widest font-black">Pick an Industry</p>
              <div className="grid grid-cols-2 gap-3">
                {INDUSTRIES.map(ind => (
                  <button key={ind.label} onClick={() => browseIndustry(ind)}
                    className={`bg-gradient-to-br ${ind.color} border border-white/10 rounded-2xl p-5 text-left hover:border-yellow-500/40 transition-all active:scale-95`}>
                    <div className="text-3xl mb-2">{ind.flag}</div>
                    <div className="text-sm font-black text-white">{ind.label}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { setActiveBrowse(null); setBrowseResults([]); }}
                  className="text-gray-400 hover:text-white text-xs font-bold">← Back</button>
                <span className="text-sm font-black">
                  {INDUSTRIES.find(i => i.label === activeBrowse.label)?.flag} {activeBrowse.label}
                </span>
              </div>
              {browseLoading && browseResults.length === 0 && <p className="text-center text-gray-500 text-sm py-8">Loading…</p>}
              <div className="space-y-3">
                {browseResults.map(item => (
                  <ResultCard key={item.id} item={item} mediaType="Movie" added={isAdded(item)} onAdd={(i) => addToLibrary(i, 'Movie')} />
                ))}
              </div>
              {browseResults.length > 0 && (
                <button onClick={() => browseIndustry(INDUSTRIES.find(i => i.label === activeBrowse.label), browsePage + 1)} disabled={browseLoading}
                  className="w-full mt-4 py-3 bg-[#1c1c26] text-gray-400 text-xs font-black rounded-2xl border border-white/10 hover:bg-[#2c2c3a] transition-colors disabled:opacity-50">
                  {browseLoading ? 'Loading…' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Director tab */}
      {tab === 'director' && (
        <div className="p-4">
          <form onSubmit={searchDirector} className="relative mb-4">
            <Users className="absolute left-4 top-4 text-gray-500" size={18} />
            <input type="text" placeholder="Director name (e.g. Nolan, Tarantino…)" value={dirQuery} onChange={e => setDirQuery(e.target.value)}
              className="w-full bg-[#1c1c26] p-4 pl-11 pr-16 rounded-2xl border border-gray-800 outline-none focus:border-yellow-500/60 text-sm transition-colors" />
            <button type="submit" className="absolute right-3 top-2.5 bg-yellow-500 text-black text-xs font-black px-3 py-1.5 rounded-xl">Find</button>
          </form>
          {dirLoading && <p className="text-center text-gray-500 text-sm py-8">Searching…</p>}
          {!selectedDir && dirResults.map(person => (
            <button key={person.id} onClick={() => loadDirectorFilms(person)}
              className="w-full flex items-center gap-3 bg-[#16161d] border border-white/5 rounded-2xl p-3 mb-2 hover:border-yellow-500/30 transition-all text-left">
              {person.profile_path
                ? <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                : <div className="w-10 h-10 rounded-full bg-[#1c1c26] flex items-center justify-center flex-shrink-0"><Users size={14} className="text-gray-600" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{person.name}</p>
                <p className="text-[10px] text-gray-500 truncate">
                  {person.known_for?.slice(0,2).map(k => k.title || k.name).join(', ')}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
            </button>
          ))}
          {selectedDir && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { setSelectedDir(null); setDirMovies([]); }}
                  className="text-gray-400 hover:text-white text-xs font-bold">← Back</button>
                {selectedDir.profile_path && <img src={`https://image.tmdb.org/t/p/w185${selectedDir.profile_path}`} className="w-8 h-8 rounded-full object-cover" alt="" />}
                <span className="text-sm font-black">{selectedDir.name}</span>
              </div>
              {dirMoviesLoading && <p className="text-center text-gray-500 text-sm py-8">Loading filmography…</p>}
              <div className="space-y-3">
                {dirMovies.map(item => (
                  <ResultCard key={`${item.id}-${item.media_type}`} item={item}
                    mediaType={item.media_type === 'tv' ? 'Series' : 'Movie'}
                    added={isAdded(item)} onAdd={(i, t) => addToLibrary(i, t)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(star => (
        <button key={star} onClick={() => onChange(star === value ? 0 : star)}
          className={`transition-colors ${star <= (value||0) ? 'text-yellow-500' : 'text-gray-700'} hover:text-yellow-400`}>
          <Star size={12} fill={star <= (value||0) ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

// ─── Circular Progress SVG ────────────────────────────────────────────────────
function CircularProgress({ pct, size = 130, stroke = 10, label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1c1c26" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EAB308" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <div className="text-2xl font-black text-yellow-500">{pct}%</div>
        {label    && <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</div>}
        {sublabel && <div className="text-[8px] text-gray-600">{sublabel}</div>}
      </div>
    </div>
  );
}

// ─── Stats Page ───────────────────────────────────────────────────────────────
function StatsPage({ movies }) {
  const watched   = movies.filter(m => m.watched);
  const favorites = movies.filter(m => m.favorite);
  const total     = movies.length;
  const pct       = total > 0 ? Math.round((watched.length / total) * 100) : 0;
  const rated     = movies.filter(m => m.rating > 0);

  // Watch time estimate (avg 2h/movie, 1h/series episode)
  const watchHours = watched.reduce((acc, m) => acc + (m.type === 'Series' ? 10 : 2), 0);
  const watchDays  = (watchHours / 24).toFixed(1);

  // Genre stats
  const genreTotals   = {};
  const genreWatched  = {};
  movies.forEach(m => {
    if (!m.genre) return;
    genreTotals[m.genre]  = (genreTotals[m.genre]  || 0) + 1;
    if (m.watched) genreWatched[m.genre] = (genreWatched[m.genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreTotals)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([g, t]) => ({ genre: g, total: t, done: genreWatched[g] || 0 }));

  // Industry stats
  const indTotals  = {};
  const indWatched = {};
  movies.forEach(m => {
    if (!m.industry) return;
    indTotals[m.industry]  = (indTotals[m.industry]  || 0) + 1;
    if (m.watched) indWatched[m.industry] = (indWatched[m.industry] || 0) + 1;
  });
  const topIndustries = Object.entries(indTotals)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([ind, t]) => ({ ind, total: t, done: indWatched[ind] || 0 }));

  // Rating distribution
  const ratingDist = [1,2,3,4,5].map(r => ({
    stars: r,
    count: movies.filter(m => m.rating === r).length,
  }));
  const maxRatingCount = Math.max(...ratingDist.map(r => r.count), 1);

  // Top rated
  const topRated = [...movies].filter(m => m.rating > 0)
    .sort((a, b) => b.rating - a.rating).slice(0, 5);

  // Achievements
  const achievements = [
    { icon: '🎬', label: 'First Watch',   unlocked: watched.length >= 1,   desc: 'Watched your first film' },
    { icon: '🔥', label: 'On a Roll',      unlocked: watched.length >= 10,  desc: '10 films watched' },
    { icon: '💯', label: 'Century',        unlocked: watched.length >= 100, desc: '100 films watched' },
    { icon: '❤️', label: 'Film Lover',     unlocked: favorites.length >= 10, desc: '10 favorites' },
    { icon: '⭐', label: 'Critic',         unlocked: rated.length >= 20,    desc: 'Rated 20 films' },
    { icon: '🌍', label: 'World Cinema',   unlocked: topIndustries.length >= 3, desc: '3+ industries explored' },
    { icon: '🎭', label: 'Genre Master',   unlocked: topGenres.length >= 5, desc: '5+ genres in library' },
    { icon: '🏆', label: 'Completionist',  unlocked: pct >= 50,             desc: '50% of library watched' },
  ];
  const unlocked = achievements.filter(a => a.unlocked).length;

  const favGenre = Object.entries(genreWatched).sort((a,b) => b[1]-a[1])[0]?.[0];
  const favIndustry = Object.entries(indWatched).sort((a,b) => b[1]-a[1])[0]?.[0];
  const favIndInfo  = INDUSTRIES.find(i => i.label === favIndustry);

  if (total === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-6 pb-28">
        <div className="text-center">
          <BarChart2 size={48} className="text-gray-800 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">No data yet</p>
          <p className="text-gray-700 text-xs mt-1">Add films to your library to see stats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-28">
      {/* Header */}
      <div className="pt-10 pb-5 px-5 bg-[#0f0f13] border-b border-white/5">
        <p className="text-[9px] uppercase tracking-[0.35em] text-gray-500">The Ultimate Canon</p>
        <h1 className="text-2xl font-black mt-0.5">Your Stats</h1>
        <p className="text-[9px] text-gray-700 mt-0.5">by <span className="text-yellow-800 font-bold">Mahmudul Hasan Mahid</span></p>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ── Hero: Progress ring + key numbers ── */}
        <div className="bg-[#111116] rounded-3xl border border-white/5 p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-4">Overall Progress</p>
          <div className="flex items-center gap-6">
            <CircularProgress pct={pct} label="done" sublabel={`${watched.length}/${total}`} />
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-2xl font-black text-white">{watched.length}</div>
                <div className="text-[9px] text-gray-600 uppercase tracking-wider">Films Watched</div>
              </div>
              <div>
                <div className="text-lg font-black text-yellow-500">{watchHours}h</div>
                <div className="text-[9px] text-gray-600 uppercase tracking-wider">Est. Watch Time</div>
              </div>
              <div>
                <div className="text-lg font-black text-gray-300">{watchDays} days</div>
                <div className="text-[9px] text-gray-600 uppercase tracking-wider">Of Your Life 🎬</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick facts ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '❤️', val: favorites.length, label: 'Favorites' },
            { icon: '⭐', val: rated.length,     label: 'Rated' },
            { icon: '🏆', val: `${unlocked}/${achievements.length}`, label: 'Achievements' },
          ].map(f => (
            <div key={f.label} className="bg-[#111116] rounded-2xl border border-white/5 p-4 text-center">
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-lg font-black text-white">{f.val}</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mt-0.5">{f.label}</div>
            </div>
          ))}
        </div>

        {/* ── Your taste ── */}
        {(favGenre || favIndustry) && (
          <div className="bg-[#111116] rounded-3xl border border-white/5 p-5">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-3">Your Taste</p>
            <div className="flex gap-3">
              {favGenre && (
                <div className="flex-1 bg-[#1c1c26] rounded-2xl p-3 text-center">
                  <div className="text-2xl mb-1">{GENRE_ICONS[favGenre] || '🎬'}</div>
                  <div className="text-xs font-black text-white">{favGenre}</div>
                  <div className="text-[9px] text-gray-600 mt-0.5">Top Genre</div>
                </div>
              )}
              {favIndustry && (
                <div className="flex-1 bg-[#1c1c26] rounded-2xl p-3 text-center">
                  <div className="text-2xl mb-1">{favIndInfo?.flag || '🌍'}</div>
                  <div className="text-xs font-black text-white">{favIndustry}</div>
                  <div className="text-[9px] text-gray-600 mt-0.5">Top Industry</div>
                </div>
              )}
              <div className="flex-1 bg-[#1c1c26] rounded-2xl p-3 text-center">
                <div className="text-2xl mb-1">{movies.filter(m=>m.type==='Movie').length > movies.filter(m=>m.type==='Series').length ? '🎬' : '📺'}</div>
                <div className="text-xs font-black text-white">{movies.filter(m=>m.type==='Movie').length > movies.filter(m=>m.type==='Series').length ? 'Movies' : 'Series'}</div>
                <div className="text-[9px] text-gray-600 mt-0.5">Preference</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Genre breakdown ── */}
        {topGenres.length > 0 && (
          <div className="bg-[#111116] rounded-3xl border border-white/5 p-5">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-4">By Genre</p>
            <div className="space-y-3">
              {topGenres.map(({ genre, total: t, done }) => {
                const pctG = Math.round((done / t) * 100);
                return (
                  <div key={genre}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{GENRE_ICONS[genre] || '🎬'}</span>
                        <span className="text-xs font-bold text-gray-300">{genre}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{done}/{t}</span>
                        <span className="text-[10px] text-yellow-600 font-bold ml-2">{pctG}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#1c1c26] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full transition-all duration-700"
                        style={{ width: `${pctG}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Industry breakdown ── */}
        {topIndustries.length > 0 && (
          <div className="bg-[#111116] rounded-3xl border border-white/5 p-5">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-4">By Industry</p>
            <div className="space-y-3">
              {topIndustries.map(({ ind, total: t, done }) => {
                const pctI  = Math.round((done / t) * 100);
                const info  = INDUSTRIES.find(i => i.label === ind);
                const color = info?.bar || '#EAB308';
                return (
                  <div key={ind}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{info?.flag || '🌍'}</span>
                        <span className="text-xs font-bold text-gray-300">{ind}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{done}/{t}</span>
                        <span className="text-[10px] font-bold ml-2" style={{ color }}>{pctI}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#1c1c26] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pctI}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Rating distribution ── */}
        {rated.length > 0 && (
          <div className="bg-[#111116] rounded-3xl border border-white/5 p-5">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-4">Your Ratings</p>
            <div className="flex items-end gap-2 h-20">
              {ratingDist.map(({ stars, count }) => (
                <div key={stars} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-500 font-bold">{count}</span>
                  <div className="w-full rounded-t-lg bg-yellow-500/20 relative overflow-hidden" style={{ height: `${Math.max((count/maxRatingCount)*56, count > 0 ? 4 : 0)}px` }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 rounded-t-lg" style={{ height: '100%' }} />
                  </div>
                  <div className="flex">
                    {Array.from({length: stars}).map((_, i) => (
                      <Star key={i} size={7} fill="#EAB308" stroke="none" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Top Rated ── */}
        {topRated.length > 0 && (
          <div className="bg-[#111116] rounded-3xl border border-white/5 p-5">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-4">🏆 Your Top Rated</p>
            <div className="space-y-3">
              {topRated.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-sm font-black text-gray-700 w-5">#{i+1}</span>
                  {m.poster
                    ? <img src={m.poster} className="w-10 h-14 object-cover rounded-xl flex-shrink-0" alt="" />
                    : <div className="w-10 h-14 bg-[#1c1c26] rounded-xl flex-shrink-0 flex items-center justify-center"><Film size={14} className="text-gray-700" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{m.title}</p>
                    <p className="text-[10px] text-gray-600">{m.year} · {m.type}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={10} fill={s <= m.rating ? '#EAB308' : 'none'} stroke={s <= m.rating ? '#EAB308' : '#374151'} strokeWidth={1.5} />
                      ))}
                    </div>
                  </div>
                  {INDUSTRIES.find(ind => ind.label === m.industry)?.flag && (
                    <span className="text-lg">{INDUSTRIES.find(ind => ind.label === m.industry).flag}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Achievements ── */}
        <div className="bg-[#111116] rounded-3xl border border-white/5 p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-1">Achievements</p>
          <p className="text-xs text-gray-600 mb-4">{unlocked} of {achievements.length} unlocked</p>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map(a => (
              <div key={a.label} className={`flex items-center gap-2.5 rounded-2xl p-3 border transition-all ${
                a.unlocked ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-[#1c1c26] border-white/5 opacity-40'
              }`}>
                <span className="text-xl">{a.icon}</span>
                <div>
                  <p className="text-[11px] font-black text-white">{a.label}</p>
                  <p className="text-[9px] text-gray-500">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Movies vs Series split ── */}
        <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 mb-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-4">Movies vs Series</p>
          {(() => {
            const mv = movies.filter(m => m.type === 'Movie').length;
            const sv = movies.filter(m => m.type === 'Series').length;
            const mvPct = total > 0 ? Math.round((mv/total)*100) : 50;
            return (
              <div>
                <div className="flex rounded-full overflow-hidden h-4 mb-3">
                  <div className="bg-yellow-500 transition-all" style={{ width: `${mvPct}%` }} />
                  <div className="bg-blue-600 flex-1" />
                </div>
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                    <span className="text-gray-400">Movies <b className="text-white">{mv}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                    <span className="text-gray-400">Series <b className="text-white">{sv}</b></span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}

// ─── Library ──────────────────────────────────────────────────────────────────
const ALL_GENRES     = ['All','Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Fantasy','History','Horror','Music','Mystery','Romance','Sci-Fi','Thriller','War','Western'];
const ALL_INDUSTRIES = ['All','Hollywood','Bollywood','Korean','Japanese','Chinese','French','Spanish','International'];
const SORT_OPTIONS   = [
  { value: 'added',     label: 'Date Added' },
  { value: 'year_desc', label: 'Newest' },
  { value: 'year_asc',  label: 'Oldest' },
  { value: 'title',     label: 'A–Z' },
  { value: 'rating',    label: 'Rating' },
];

function LibraryPage({ movies, onToggle, onDelete, onRate, onLogout, onOpenSeed }) {
  const [libSearch,      setLibSearch]      = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [sectionFilter,  setSectionFilter]  = useState('all');
  const [genreFilter,    setGenreFilter]    = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [sortBy,         setSortBy]         = useState('added');
  const [showSort,       setShowSort]       = useState(false);

  const total        = movies.length;
  const watched      = movies.filter(m => m.watched).length;
  const pct          = total > 0 ? Math.round((watched / total) * 100) : 0;
  const first100     = movies.slice(0, 100);
  const next100      = movies.slice(100, 200);
  const watchedFirst = first100.filter(m => m.watched).length;
  const watchedNext  = next100.filter(m => m.watched).length;

  let filtered = movies.filter((m, idx) => {
    if (sectionFilter === 'first100' && idx >= 100) return false;
    if (sectionFilter === 'next100'  && idx < 100)  return false;
    if (statusFilter === 'watched'   && !m.watched)  return false;
    if (statusFilter === 'unwatched' && m.watched)   return false;
    if (statusFilter === 'favorites' && !m.favorite) return false;
    if (genreFilter    !== 'All' && m.genre    !== genreFilter)    return false;
    if (industryFilter !== 'All' && m.industry !== industryFilter) return false;
    if (libSearch) return (m.title || '').toLowerCase().includes(libSearch.toLowerCase());
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'year_desc') return parseInt(b.year || 0) - parseInt(a.year || 0);
    if (sortBy === 'year_asc')  return parseInt(a.year || 0) - parseInt(b.year || 0);
    if (sortBy === 'title')     return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'rating')    return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const Chip = ({ active, onClick, children, activeClass = 'bg-yellow-500 text-black' }) => (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
        active ? activeClass : 'bg-[#1c1c26] text-gray-400 border border-white/10 hover:text-gray-200'
      }`}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-28">

      {/* Header */}
      <div className="pt-10 pb-6 px-5 bg-[#0f0f13] border-b border-white/5">
        <div className="flex justify-between items-start mb-1">
          <div>
            <p className="text-[9px] uppercase tracking-[0.35em] text-gray-500">The Ultimate Canon</p>
            <h1 className="text-2xl font-black mt-0.5">Masterpiece Tracker</h1>
            <p className="text-[9px] text-gray-700 mt-0.5">by <span className="text-yellow-800 font-bold">Mahmudul Hasan Mahid</span></p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button onClick={onOpenSeed}
              className="text-[10px] font-black text-yellow-600 border border-yellow-600/30 px-3 py-1.5 rounded-full hover:bg-yellow-500/10 transition-colors flex items-center gap-1">
              <Download size={11} /> Import
            </button>
            <button onClick={onLogout} className="text-gray-600 hover:text-gray-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-5 mb-4">
          {[
            { val: watchedFirst, total: first100.length || 100, label: 'First 100' },
            { val: watchedNext,  total: next100.length  || 100, label: 'Next 100' },
            { val: watched,      total,                          label: 'Total' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-black text-yellow-500">
                {s.val}<span className="text-xs font-normal text-gray-500">/{s.total}</span>
              </div>
              <div className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-[9px] text-gray-600 mb-1.5">
          <span>{watched} watched</span>
          <span className="text-yellow-600 font-black">{pct}%</span>
          <span>{total - watched} remaining</span>
        </div>
        <div className="w-full h-1 bg-[#1c1c26] rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Sticky filters */}
      <div className="sticky top-0 z-40 bg-[#0a0a0c]/95 backdrop-blur-md pt-3 pb-2 border-b border-white/5">
        <div className="px-4 mb-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-600" size={15} />
            <input type="text" placeholder="Search library..." value={libSearch}
              onChange={e => setLibSearch(e.target.value)}
              className="w-full bg-[#111116] pl-9 pr-4 py-3 rounded-2xl border border-white/5 outline-none focus:border-yellow-500/40 text-sm transition-colors" />
          </div>
          <div className="relative">
            <button onClick={() => setShowSort(s => !s)}
              className={`h-full px-3 rounded-2xl border flex items-center gap-1 ${
                sortBy !== 'added' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-[#111116] border-white/5 text-gray-500'
              }`}>
              <SlidersHorizontal size={15} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-2 bg-[#1c1c26] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-36 z-50">
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => { setSortBy(o.value); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${
                      sortBy === o.value ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={scrollTop}
            className="h-full px-3 rounded-2xl border border-white/5 bg-[#111116] text-gray-500 hover:text-white flex items-center">
            <ArrowUp size={15} />
          </button>
        </div>

        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide mb-2">
          <Chip active={statusFilter==='all'}       onClick={() => setStatusFilter('all')}>All</Chip>
          <Chip active={statusFilter==='watched'}   onClick={() => setStatusFilter('watched')}>✓ Watched</Chip>
          <Chip active={statusFilter==='unwatched'} onClick={() => setStatusFilter('unwatched')}>Unwatched</Chip>
          <Chip active={statusFilter==='favorites'} onClick={() => setStatusFilter('favorites')}>❤️ Faves</Chip>
          <div className="w-px h-5 bg-white/10 self-center mx-1 flex-shrink-0" />
          <Chip active={sectionFilter==='all'}      onClick={() => setSectionFilter('all')}      activeClass="bg-[#2c2c3a] text-white border border-white/20">All</Chip>
          <Chip active={sectionFilter==='first100'} onClick={() => setSectionFilter('first100')} activeClass="bg-[#2c2c3a] text-white border border-white/20">First 100</Chip>
          <Chip active={sectionFilter==='next100'}  onClick={() => setSectionFilter('next100')}  activeClass="bg-[#2c2c3a] text-white border border-white/20">Next 100</Chip>
        </div>

        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide mb-2">
          {ALL_INDUSTRIES.map(ind => {
            const info = INDUSTRIES.find(i => i.label === ind);
            return (
              <Chip key={ind} active={industryFilter===ind} onClick={() => setIndustryFilter(ind)}>
                {info?.flag ? `${info.flag} ${ind}` : ind === 'All' ? '🌍 All' : ind}
              </Chip>
            );
          })}
        </div>

        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {ALL_GENRES.map(g => <Chip key={g} active={genreFilter===g} onClick={() => setGenreFilter(g)}>{g}</Chip>)}
        </div>
      </div>

      {/* Movie list */}
      <div className="px-4 pt-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">
          {filtered.length} film{filtered.length !== 1 ? 's' : ''}
          {sortBy !== 'added' && <span className="ml-2 text-yellow-700">· {SORT_OPTIONS.find(o=>o.value===sortBy)?.label}</span>}
        </p>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Film size={36} className="text-gray-800 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No films found</p>
            {movies.length === 0
              ? <div className="mt-4">
                  <p className="text-gray-700 text-xs mb-4">Start by importing 500 popular films</p>
                  <button onClick={onOpenSeed}
                    className="bg-yellow-500 text-black text-xs font-black px-6 py-3 rounded-2xl hover:bg-yellow-400 transition-colors">
                    Import 500 Films
                  </button>
                </div>
              : <p className="text-gray-700 text-xs mt-1">Try adjusting your filters</p>
            }
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((movie) => {
            const rankNum    = movies.indexOf(movie) + 1;
            const indInfo    = INDUSTRIES.find(i => i.label === movie.industry);
            return (
              <div key={movie.id} className="flex bg-[#111116] rounded-2xl border border-white/[0.05] overflow-hidden">
                <div className="w-16 flex-shrink-0 relative">
                  {movie.poster
                    ? <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" style={{ minHeight: 96 }} />
                    : <div className="w-full h-full min-h-[96px] bg-[#1c1c26] flex items-center justify-center"><Film size={20} className="text-gray-700" /></div>
                  }
                  <div className="absolute top-1 left-1 bg-black/70 rounded-md px-1 py-0.5">
                    <span className="text-[9px] text-gray-400 font-mono">{rankNum}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between">
                  <div>
                    <h3 className={`font-bold text-sm leading-snug ${movie.watched ? 'text-gray-500 line-through' : 'text-white'}`}>
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {movie.year && <span className="text-xs text-yellow-600 font-bold">{movie.year}</span>}
                      {movie.type && <span className="text-[9px] text-gray-600 uppercase tracking-wider">{movie.type}</span>}
                      {indInfo && <span className="text-[9px]">{indInfo.flag}</span>}
                      {movie.genre && (
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${genreColor(movie.genre)}`}>
                          {movie.genre}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <StarRating value={movie.rating || 0} onChange={val => onRate(movie.id, val)} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => onToggle(movie.id, 'watched', movie.watched)}
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                        movie.watched ? 'bg-green-900/40 text-green-400' : 'bg-[#1c1c26] text-gray-500 hover:text-gray-300'
                      }`}>
                      <CheckCircle size={12} strokeWidth={2.5} />
                      {movie.watched ? 'Watched' : 'Unwatched'}
                    </button>
                    <button onClick={() => onToggle(movie.id, 'favorite', movie.favorite)}
                      className={`transition-colors ${movie.favorite ? 'text-red-500' : 'text-gray-700 hover:text-gray-500'}`}>
                      <Heart size={16} fill={movie.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => onDelete(movie.id)}
                      className="text-gray-700 hover:text-red-500 transition-colors ml-auto">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Seed Modal ───────────────────────────────────────────────────────────────
function SeedModal({ onClose, onDone, userId }) {
  const [progress, setProgress] = useState(0);
  const [status,   setStatus]   = useState('');
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [count,    setCount]    = useState(0);

  const run = async () => {
    setRunning(true);
    const items = [];

    for (let page = 1; page <= 20; page++) {
      setStatus(`Fetching movies… page ${page}/20`);
      setProgress(Math.round((page / 27) * 80));
      try {
        const res  = await fetch(`https://api.themoviedb.org/3/discover/movie?sort_by=vote_count.desc&vote_count.gte=500&include_adult=false&page=${page}`, TMDB_HEADERS);
        const data = await res.json();
        for (const m of (data.results || [])) {
          items.push({ user_id: userId, title: m.title || m.original_title || 'Untitled',
            year: m.release_date?.split('-')[0] || '', type: 'Movie',
            poster: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
            genre: TMDB_GENRES[m.genre_ids?.[0]] || null, industry: detectIndustry(m.original_language),
            watched: false, favorite: false });
        }
      } catch (_) {}
    }

    for (let page = 1; page <= 5; page++) {
      setStatus(`Fetching series… page ${page}/5`);
      setProgress(Math.round(((20 + page) / 27) * 80));
      try {
        const res  = await fetch(`https://api.themoviedb.org/3/discover/tv?sort_by=vote_count.desc&vote_count.gte=500&include_adult=false&page=${page}`, TMDB_HEADERS);
        const data = await res.json();
        for (const m of (data.results || [])) {
          items.push({ user_id: userId, title: m.name || m.original_name || 'Untitled',
            year: m.first_air_date?.split('-')[0] || '', type: 'Series',
            poster: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
            genre: TMDB_GENRES[m.genre_ids?.[0]] || null, industry: detectIndustry(m.original_language),
            watched: false, favorite: false });
        }
      } catch (_) {}
    }

    const seen   = new Set();
    const unique = items.filter(m => { const k = m.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    const batches = [];
    for (let i = 0; i < unique.length; i += 50) batches.push(unique.slice(i, i + 50));

    let inserted = 0;
    for (let i = 0; i < batches.length; i++) {
      setStatus(`Saving… ${inserted}/${unique.length}`);
      setProgress(80 + Math.round((i / batches.length) * 20));
      const { error } = await supabase.from('movies').insert(batches[i]);
      if (!error) inserted += batches[i].length;
    }

    setCount(inserted); setProgress(100); setStatus('Done!'); setDone(true); setRunning(false); onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#16161d] rounded-3xl border border-white/10 p-8 text-center">
        <Film size={36} className="text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1">Import 500 Films</h2>
        <p className="text-xs text-gray-500 mb-6">Top-voted movies & series from TMDB with real posters, genres, and industry tags.</p>
        {!running && !done && (
          <div className="space-y-3">
            <button onClick={run} className="w-full bg-yellow-500 text-black font-black py-4 rounded-2xl hover:bg-yellow-400 transition-colors">Start Import</button>
            <button onClick={onClose} className="w-full bg-white/5 text-gray-400 font-bold py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">Cancel</button>
          </div>
        )}
        {(running || done) && (
          <div>
            <div className="w-full h-2 bg-[#1c1c26] rounded-full overflow-hidden mb-3">
              <div className="h-full bg-yellow-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mb-1">{progress}%</p>
            <p className="text-[11px] text-gray-600">{status}</p>
            {done && (
              <div className="mt-6">
                <p className="text-green-400 font-bold text-sm mb-4">✓ {count} films added!</p>
                <button onClick={onClose} className="w-full bg-yellow-500 text-black font-black py-4 rounded-2xl hover:bg-yellow-400 transition-colors">View Library</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ view, setView }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f13]/95 backdrop-blur-lg border-t border-white/5">
      <div className="flex items-center justify-around py-2 px-8">
        <button onClick={() => setView('library')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${view === 'library' ? 'text-yellow-500' : 'text-gray-600 hover:text-gray-400'}`}>
          <Film size={22} strokeWidth={view === 'library' ? 2.5 : 1.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Library</span>
        </button>

        <button onClick={() => setView('search')}
          className="w-14 h-14 bg-yellow-500 text-black rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 hover:bg-yellow-400 transition-all active:scale-95 -mt-5">
          <Plus size={26} strokeWidth={2.5} />
        </button>

        <button onClick={() => setView('stats')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${view === 'stats' ? 'text-yellow-500' : 'text-gray-600 hover:text-gray-400'}`}>
          <BarChart2 size={22} strokeWidth={view === 'stats' ? 2.5 : 1.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Stats</span>
        </button>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,     setUser]     = useState(null);
  const [movies,   setMovies]   = useState([]);
  const [view,     setView]     = useState('library');
  const [showSeed, setShowSeed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) fetchMovies(); else setMovies([]); }, [user]);

  const fetchMovies = async () => {
    const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: true });
    if (!error) setMovies(data);
  };

  // Optimistic updates — UI responds instantly, syncs to Supabase in background
  const toggleStatus = async (id, field, val) => {
    setMovies(prev => prev.map(m => m.id === id ? { ...m, [field]: !val } : m));
    await supabase.from('movies').update({ [field]: !val }).eq('id', id);
  };
  const rateMovie = async (id, rating) => {
    setMovies(prev => prev.map(m => m.id === id ? { ...m, rating } : m));
    await supabase.from('movies').update({ rating }).eq('id', id);
  };
  const deleteMovie = async (id) => {
    setMovies(prev => prev.filter(m => m.id !== id));
    const { error } = await supabase.from('movies').delete().eq('id', id);
    if (error) { alert(error.message); fetchMovies(); }
  };

  if (!user) return <LoginScreen />;

  if (view === 'search') {
    const existingTitles = new Set(movies.map(m => (m.title || '').toLowerCase()));
    return <SearchPage onBack={() => setView('library')} onAdded={fetchMovies} existingTitles={existingTitles} />;
  }

  return (
    <>
      {view === 'library' && (
        <LibraryPage movies={movies} onToggle={toggleStatus} onRate={rateMovie} onDelete={deleteMovie}
          onLogout={() => supabase.auth.signOut()} onOpenSeed={() => setShowSeed(true)} />
      )}
      {view === 'stats' && <StatsPage movies={movies} />}

      <BottomNav view={view} setView={setView} />

      {showSeed && <SeedModal userId={user.id} onClose={() => setShowSeed(false)} onDone={fetchMovies} />}
    </>
  );
}
