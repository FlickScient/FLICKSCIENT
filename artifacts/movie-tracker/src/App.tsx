// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search, Heart, CheckCircle, LogOut, Plus, ArrowUp,
  Film, ChevronRight, X
} from 'lucide-react';

// --- CONFIGURATION ---
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTA1NDM4MWYzY2M2NGY1ZjllNmVkNjVlMjIwNzgzYiIsIm5iZiI6MTc3NzU2MzkzNy4zMzIsInN1YiI6IjY5ZjM3OTIxZWFjNjM3MmZmYjBlNjAyNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.YgTiOJcH5eCqqrc3uWg6CvTNbvCa5UNzy4jpaeQ6zXs";
const SUPABASE_URL = "https://rcdjmzxiectkckufyqyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZGptenhpZWN0a2NrdWZ5cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjcxOTMsImV4cCI6MjA5MzE0MzE5M30.TNFfE6RDV4MX3H-M8zA-h72lux4Mgdd9srqDFJAJHnE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// TMDB genre id -> name
const TMDB_GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action',
  10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi',
  10766: 'Soap', 10767: 'Talk', 10768: 'War', 37: 'Western'
};

const GENRE_COLORS = {
  Action:       'bg-red-900/60 text-red-300',
  Adventure:    'bg-orange-900/60 text-orange-300',
  Animation:    'bg-purple-900/60 text-purple-300',
  Comedy:       'bg-yellow-900/60 text-yellow-300',
  Crime:        'bg-amber-800/60 text-amber-300',
  Documentary:  'bg-teal-900/60 text-teal-300',
  Drama:        'bg-green-900/60 text-green-300',
  Family:       'bg-pink-900/60 text-pink-300',
  Fantasy:      'bg-violet-900/60 text-violet-300',
  History:      'bg-stone-700/60 text-stone-300',
  Horror:       'bg-red-950/80 text-red-400',
  Music:        'bg-indigo-900/60 text-indigo-300',
  Mystery:      'bg-blue-900/60 text-blue-300',
  Romance:      'bg-rose-900/60 text-rose-300',
  'Sci-Fi':     'bg-cyan-900/60 text-cyan-300',
  Thriller:     'bg-orange-950/60 text-orange-300',
  War:          'bg-gray-800/60 text-gray-300',
  Western:      'bg-yellow-950/60 text-yellow-600',
  default:      'bg-gray-800/60 text-gray-400',
};

function genreColor(genre) {
  return GENRE_COLORS[genre] || GENRE_COLORS.default;
}

// ─── Login Screen ───────────────────────────────────────────────────────────
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
        <input
          type="email" placeholder="Email"
          className="w-full bg-[#0a0a0c] p-4 rounded-xl mb-4 border border-gray-800 outline-none focus:border-yellow-500/50 transition-colors text-sm"
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password" placeholder="Password"
          className="w-full bg-[#0a0a0c] p-4 rounded-xl mb-6 border border-gray-800 outline-none focus:border-yellow-500/50 transition-colors text-sm"
          onChange={e => setPassword(e.target.value)}
        />
        <div className="flex gap-3">
          <button
            onClick={() => handleAuth('login')} disabled={loading}
            className="flex-1 bg-yellow-500 text-black font-bold py-4 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >Login</button>
          <button
            onClick={() => handleAuth('signup')} disabled={loading}
            className="flex-1 bg-white/5 text-white font-bold py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
          >Sign Up</button>
        </div>
      </div>
    </div>
  );
}

// ─── Search / Add Page ───────────────────────────────────────────────────────
function SearchPage({ onBack, onAdded, existingIds }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(new Set());

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false`,
      { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
    );
    const data = await res.json();
    setResults((data.results || []).filter(r => r.media_type !== 'person'));
    setLoading(false);
  };

  const addToLibrary = async (item) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('You must be logged in.'); return; }

    const primaryGenreId = item.genre_ids?.[0];
    const genre = primaryGenreId ? TMDB_GENRES[primaryGenreId] || null : null;

    // Insert core fields first (always works with the base schema)
    const { data: inserted, error } = await supabase.from('movies').insert([{
      user_id: user.id,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || '').split('-')[0],
      type: item.media_type === 'tv' ? 'Series' : 'Movie',
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
    }]).select('id').single();

    if (error) {
      alert('Could not add film: ' + error.message);
      return;
    }

    // Try to update genre — silently ignores if column doesn't exist yet
    if (genre && inserted?.id) {
      await supabase.from('movies').update({ genre }).eq('id', inserted.id);
    }

    setAdded(prev => new Set([...prev, item.id]));
    onAdded();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-24">
      {/* Header */}
      <div className="pt-10 pb-5 px-5 bg-[#0f0f13] border-b border-white/5 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <X size={22} />
        </button>
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-gray-500">The Ultimate Canon</p>
          <h2 className="text-lg font-black">Add Films</h2>
        </div>
      </div>

      {/* Search bar */}
      <div className="p-4">
        <form onSubmit={search} className="relative">
          <input
            type="text"
            placeholder="Search movies or series..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#1c1c26] p-4 pl-12 pr-4 rounded-2xl border border-gray-800 outline-none focus:border-yellow-500/60 text-sm transition-colors"
          />
          <Search className="absolute left-4 top-4 text-gray-500" size={20} />
          <button type="submit" className="absolute right-3 top-2.5 bg-yellow-500 text-black text-xs font-black px-3 py-1.5 rounded-xl">
            Search
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-10 text-gray-500 text-sm">Searching...</div>
      )}

      {/* Results */}
      <div className="px-4 space-y-3">
        {results.map(item => {
          const isAdded = added.has(item.id) || existingIds.has(item.id);
          const genre = item.genre_ids?.[0] ? TMDB_GENRES[item.genre_ids[0]] : null;
          return (
            <div key={item.id} className="flex bg-[#16161d] p-3 rounded-2xl gap-4 border border-white/5 items-center">
              {item.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                  className="w-14 h-20 object-cover rounded-xl flex-shrink-0"
                  alt=""
                />
              ) : (
                <div className="w-14 h-20 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Film size={20} className="text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm mb-1 truncate">{item.title || item.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">
                    {(item.release_date || item.first_air_date || '').split('-')[0]}
                  </span>
                  {genre && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${genreColor(genre)}`}>
                      {genre}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => addToLibrary(item)}
                  disabled={isAdded}
                  className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-wider transition-all ${
                    isAdded
                      ? 'bg-green-900/40 text-green-400 cursor-default'
                      : 'bg-yellow-500 text-black hover:bg-yellow-400'
                  }`}
                >
                  {isAdded ? '✓ Added' : 'Add to Library'}
                </button>
              </div>
            </div>
          );
        })}
        {!loading && results.length === 0 && query && (
          <div className="text-center py-10 text-gray-600 text-sm">No results found</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Library ────────────────────────────────────────────────────────────
const ALL_GENRES = [
  'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'History', 'Horror', 'Music',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

function LibraryPage({ movies, onToggle, onLogout, onOpenSearch }) {
  const [libSearch, setLibSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('All');
  const scrollRef = useRef(null);

  const total = movies.length;
  const watched = movies.filter(m => m.watched).length;
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0;

  const first100 = movies.slice(0, 100);
  const next100 = movies.slice(100, 200);
  const watchedFirst = first100.filter(m => m.watched).length;
  const watchedNext = next100.filter(m => m.watched).length;

  const filtered = movies.filter((m, idx) => {
    if (sectionFilter === 'first100' && idx >= 100) return false;
    if (sectionFilter === 'next100' && idx < 100) return false;
    if (statusFilter === 'watched' && !m.watched) return false;
    if (statusFilter === 'unwatched' && m.watched) return false;
    if (statusFilter === 'favorites' && !m.favorite) return false;
    if (genreFilter !== 'All' && m.genre !== genreFilter) return false;
    if (libSearch) {
      const q = libSearch.toLowerCase();
      return (m.title || '').toLowerCase().includes(q);
    }
    return true;
  });

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const StatusChip = ({ value, label }) => (
    <button
      onClick={() => setStatusFilter(value)}
      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
        statusFilter === value
          ? 'bg-yellow-500 text-black'
          : 'bg-[#1c1c26] text-gray-400 border border-white/10'
      }`}
    >
      {label}
    </button>
  );

  const SectionChip = ({ value, label }) => (
    <button
      onClick={() => setSectionFilter(value)}
      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
        sectionFilter === value
          ? 'bg-[#2c2c3a] text-white border border-white/20'
          : 'bg-[#1c1c26] text-gray-500 border border-white/5'
      }`}
    >
      {label}
    </button>
  );

  const GenreChip = ({ genre }) => (
    <button
      onClick={() => setGenreFilter(genre)}
      className={`px-3 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all ${
        genreFilter === genre
          ? 'bg-yellow-500 text-black'
          : 'bg-[#1c1c26] text-gray-400 border border-white/10'
      }`}
    >
      {genre}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-28" ref={scrollRef}>

      {/* ── Header ── */}
      <div className="pt-10 pb-6 px-5 bg-[#0f0f13] border-b border-white/5">
        <div className="flex justify-between items-start mb-1">
          <div>
            <p className="text-[9px] uppercase tracking-[0.35em] text-gray-500">The Ultimate Canon</p>
            <h1 className="text-2xl font-black mt-0.5">Masterpiece Tracker</h1>
          </div>
          <button onClick={onLogout} className="text-gray-600 hover:text-gray-400 transition-colors mt-1">
            <LogOut size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-5 mb-4">
          <div className="text-center">
            <div className="text-xl font-black text-yellow-500">
              {watchedFirst}
              <span className="text-xs font-normal text-gray-500">/{first100.length || 100}</span>
            </div>
            <div className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5">First 100</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-yellow-500">
              {watchedNext}
              <span className="text-xs font-normal text-gray-500">/{next100.length || 99}</span>
            </div>
            <div className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5">Next 100</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-yellow-500">
              {watched}
              <span className="text-xs font-normal text-gray-500">/{total}</span>
            </div>
            <div className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5">Total</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-between text-[9px] text-gray-600 mb-1.5">
          <span>{watched} watched</span>
          <span className="text-yellow-600 font-black">{pct}%</span>
          <span>{total - watched} remaining</span>
        </div>
        <div className="w-full h-1 bg-[#1c1c26] rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Sticky filters ── */}
      <div className="sticky top-0 z-40 bg-[#0a0a0c]/95 backdrop-blur-md pt-3 pb-2 border-b border-white/5">
        {/* Library search */}
        <div className="px-4 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-600" size={16} />
            <input
              type="text"
              placeholder="Search title or director..."
              value={libSearch}
              onChange={e => setLibSearch(e.target.value)}
              className="w-full bg-[#111116] pl-9 pr-4 py-3 rounded-2xl border border-white/5 outline-none focus:border-yellow-500/40 text-sm transition-colors"
            />
          </div>
        </div>

        {/* Status chips */}
        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide mb-2">
          <StatusChip value="all" label="All Films" />
          <StatusChip value="watched" label="Watched" />
          <StatusChip value="unwatched" label="Unwatched" />
          <StatusChip value="favorites" label="Favorites" />
          <div className="w-px h-6 bg-white/10 self-center mx-1 flex-shrink-0" />
          <SectionChip value="all" label="All" />
          <SectionChip value="first100" label="First 100" />
          <SectionChip value="next100" label="Next 100" />
        </div>

        {/* Genre chips */}
        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {ALL_GENRES.map(g => <GenreChip key={g} genre={g} />)}
        </div>
      </div>

      {/* ── Movie list ── */}
      <div className="px-4 pt-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">
          {filtered.length} film{filtered.length !== 1 ? 's' : ''}
        </p>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Film size={36} className="text-gray-800 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No films found</p>
            <p className="text-gray-700 text-xs mt-1">Try adjusting filters or add films via the + button</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((movie, idx) => {
            const globalIdx = movies.indexOf(movie);
            const rankNum = globalIdx + 1;
            return (
              <div
                key={movie.id}
                className="flex items-center bg-[#111116] rounded-2xl border border-white/[0.04] overflow-hidden"
              >
                {/* Rank number */}
                <div className="w-10 text-center flex-shrink-0 py-4">
                  <span className="text-xs text-gray-600 font-mono">{rankNum}</span>
                </div>

                {/* Watched checkbox */}
                <button
                  onClick={() => onToggle(movie.id, 'watched', movie.watched)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mr-3 transition-all ${
                    movie.watched
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {movie.watched && <CheckCircle size={12} className="text-black" strokeWidth={3} />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0 py-3.5">
                  <h3 className={`font-bold text-sm truncate ${movie.watched ? 'text-gray-600 line-through' : 'text-white'}`}>
                    {movie.title}
                  </h3>
                  {movie.year && (
                    <p className="text-[10px] text-gray-600 mt-0.5">{movie.year}</p>
                  )}
                </div>

                {/* Genre badge */}
                <div className="flex items-center gap-2 px-3 flex-shrink-0">
                  {movie.genre && (
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${genreColor(movie.genre)}`}>
                      {movie.genre}
                    </span>
                  )}
                  {/* Favorite button */}
                  <button
                    onClick={() => onToggle(movie.id, 'favorite', movie.favorite)}
                    className={`transition-colors ml-1 ${movie.favorite ? 'text-red-500' : 'text-gray-800 hover:text-gray-600'}`}
                  >
                    <Heart size={17} fill={movie.favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-between items-end px-6 z-50 pointer-events-none">
        <button
          onClick={onOpenSearch}
          className="pointer-events-auto w-14 h-14 bg-yellow-500 text-black rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
        <button
          onClick={scrollTop}
          className="pointer-events-auto w-12 h-12 bg-[#1c1c26]/90 backdrop-blur-md text-gray-400 rounded-full flex items-center justify-center border border-white/10 hover:text-white transition-colors"
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [view, setView] = useState('library');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchMovies();
    else setMovies([]);
  }, [user]);

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error) setMovies(data);
  };

  const toggleStatus = async (id, field, currentVal) => {
    await supabase.from('movies').update({ [field]: !currentVal }).eq('id', id);
    fetchMovies();
  };

  if (!user) return <LoginScreen />;

  if (view === 'search') {
    const existingIds = new Set();
    return (
      <SearchPage
        onBack={() => setView('library')}
        onAdded={fetchMovies}
        existingIds={existingIds}
      />
    );
  }

  return (
    <LibraryPage
      movies={movies}
      onToggle={toggleStatus}
      onLogout={() => supabase.auth.signOut()}
      onOpenSearch={() => setView('search')}
    />
  );
}
