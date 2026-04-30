// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Heart, CheckCircle, Globe, List, Film, LogOut } from 'lucide-react';

// --- CONFIGURATION ---
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTA1NDM4MWYzY2M2NGY1ZjllNmVkNjVlMjIwNzgzYiIsIm5iZiI6MTc3NzU2MzkzNy4zMzIsInN1YiI6IjY5ZjM3OTIxZWFjNjM3MmZmYjBlNjAyNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.YgTiOJcH5eCqqrc3uWg6CvTNbvCa5UNzy4jpaeQ6zXs";
const SUPABASE_URL = "https://rcdjmzxiectkckufyqyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZGptenhpZWN0a2NrdWZ5cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjcxOTMsImV4cCI6MjA5MzE0MzE5M30.TNFfE6RDV4MX3H-M8zA-h72lux4Mgdd9srqDFJAJHnE"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [myList, setMyList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [view, setView] = useState('library'); 
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) fetchMovies(); }, [user]);

  const fetchMovies = async () => {
    const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
    if (!error) setMyList(data);
  };

  const handleAuth = async (type) => {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
  };

  const searchMovies = async (e) => {
    e.preventDefault();
    if (!query) return;
    setView('search');
    const res = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` }
    });
    const data = await res.json();
    setSearchResults(data.results || []);
  };

  const addToLibrary = async (item) => {
    if (!user) return;
    const { error } = await supabase.from('movies').insert([{
      user_id: user.id,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || "").split('-')[0],
      type: item.media_type === 'tv' ? 'Series' : 'Movie',
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null
    }]);
    if (!error) { fetchMovies(); setView('library'); setQuery(''); }
  };

  const toggleStatus = async (id, field, currentVal) => {
    await supabase.from('movies').update({ [field]: !currentVal }).eq('id', id);
    fetchMovies();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#16161d] p-8 rounded-3xl border border-white/5 shadow-2xl text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-2 font-black">The Ultimate Canon</p>
          <h2 className="text-3xl font-black text-yellow-500 mb-8">Movie Sync</h2>
          <input type="email" placeholder="Email" className="w-full bg-[#0a0a0c] p-4 rounded-xl mb-4 border border-gray-800 outline-none p-3" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full bg-[#0a0a0c] p-4 rounded-xl mb-6 border border-gray-800 outline-none p-3" onChange={e => setPassword(e.target.value)} />
          <div className="flex gap-4">
            <button onClick={() => handleAuth('login')} className="flex-1 bg-yellow-500 text-black font-bold py-4 rounded-xl">Login</button>
            <button onClick={() => handleAuth('signup')} className="flex-1 bg-white/5 text-white font-bold py-4 rounded-xl border border-white/10">Sign Up</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans pb-24">
      <div className="pt-12 pb-8 px-6 text-center bg-[#0f0f13] border-b border-white/5">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-2">The Ultimate Canon</p>
        <h2 className="text-3xl font-serif font-bold italic mb-6">Masterpiece Tracker</h2>
      </div>

      <div className="p-4 sticky top-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-md">
        <form onSubmit={searchMovies} className="relative">
          <input type="text" placeholder="Search internet..." className="w-full bg-[#1c1c26] p-4 pl-12 rounded-2xl border border-gray-800 outline-none focus:border-yellow-500 text-sm" value={query} onChange={e => setQuery(e.target.value)} />
          <Search className="absolute left-4 top-4 text-gray-500" size={20} />
        </form>
      </div>

      <div className="px-4 space-y-3">
        {view === 'search' ? (
          searchResults.map(item => (
            <div key={item.id} className="flex bg-[#16161d] p-3 rounded-2xl gap-4 border border-white/5 items-center">
              <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} className="w-16 h-24 object-cover rounded-lg" alt="" />
              <div className="flex-1">
                <h3 className="font-bold text-sm mb-2">{item.title || item.name}</h3>
                <button onClick={() => addToLibrary(item)} className="bg-yellow-500 text-black text-[10px] font-black px-4 py-2 rounded-lg uppercase">Add to Sync</button>
              </div>
            </div>
          ))
        ) : (
          myList.map((movie, index) => (
            <div key={movie.id} className="flex items-center justify-between bg-[#111116] p-4 rounded-2xl border border-white/5 shadow-sm">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleStatus(movie.id, 'watched', movie.watched)} className={`w-6 h-6 rounded flex items-center justify-center border-2 ${movie.watched ? 'bg-green-500 border-green-500' : 'border-gray-700'}`}>
                  {movie.watched && <CheckCircle size={16} className="text-black" strokeWidth={3} />}
                </button>
                <div>
                  <h3 className={`font-bold text-sm ${movie.watched ? 'text-gray-600 line-through' : 'text-white'}`}>{movie.title}</h3>
                  <p className="text-[9px] font-black text-yellow-700 uppercase tracking-widest">{movie.year}</p>
                </div>
              </div>
              <button onClick={() => toggleStatus(movie.id, 'favorite', movie.favorite)} className={movie.favorite ? "text-red-500" : "text-gray-800"}>
                <Heart size={20} fill={movie.favorite ? "currentColor" : "none"} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c26]/90 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full flex items-center gap-10 shadow-2xl z-50">
        <button onClick={() => setView('library')} className={view === 'library' ? "text-yellow-500" : "text-gray-500"}><List size={24}/></button>
        <button onClick={() => setView('search')} className={view === 'search' ? "text-yellow-500" : "text-gray-500"}><Globe size={24}/></button>
        <button onClick={() => supabase.auth.signOut()} className="text-gray-500"><LogOut size={24}/></button>
      </div>
    </div>
  );
}
