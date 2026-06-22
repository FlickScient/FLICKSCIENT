// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import FlickScient from './FlickScient';

import LoginPage     from './pages/LoginPage';
import LibraryPage   from './pages/LibraryPage';
import StatsPage     from './pages/StatsPage';
import SearchPage    from './pages/SearchPage';

import DrawerMenu, { WelcomeModal } from './components/DrawerMenu';
import BottomNav  from './components/BottomNav';
import SeedModal  from './components/SeedModal';
import { AmbientBackground } from './components/NowWatching';

// ─── Hash routing helpers ─────────────────────────────────────────────────────
function getViewFromHash() {
  const hash = window.location.hash.replace('#', '');
  if (['flickscient', 'stats', 'search'].includes(hash)) return hash;
  return 'library';
}

function cleanAuthHash() {
  if (
    window.location.hash.includes('access_token') ||
    window.location.hash.includes('refresh_token') ||
    window.location.hash.includes('token_type')
  ) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,        setUser]       = useState(null);
  const [movies,      setMovies]     = useState([]);
  const [view,        setViewState]  = useState(getViewFromHash);
  const [showSeed,    setShowSeed]   = useState(false);
  const [drawerOpen,  setDrawerOpen] = useState(false);
  const [theme,       setTheme]      = useState<'dark'|'light'|'maestro'>('dark');
  const [showWelcome,   setShowWelcome]   = useState(false);
  const [nowWatchingId, setNowWatchingId] = useState<string | null>(() => {
    try { return localStorage.getItem('nowWatchingId') || null; } catch { return null; }
  });

  const nowWatchingMovie = nowWatchingId ? movies.find(m => m.id === nowWatchingId) ?? null : null;

  const setNowWatching = (id: string | null) => {
    setNowWatchingId(id);
    try {
      if (id) localStorage.setItem('nowWatchingId', id);
      else    localStorage.removeItem('nowWatchingId');
    } catch {}
  };

  // Load theme from Supabase profiles when user logs in
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('light_mode, theme').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.theme && ['dark','light','maestro'].includes(data.theme)) setTheme(data.theme);
        else if (data && typeof data.light_mode === 'boolean') setTheme(data.light_mode ? 'light' : 'dark');
      });
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('maestro', theme === 'maestro');
    if (user) {
      supabase.from('profiles').upsert({ id: user.id, theme }, { onConflict: 'id' });
    }
  }, [theme]);

  const setView = (v) => {
    setViewState(v);
    if (v === 'library') {
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      window.history.replaceState(null, '', '#' + v);
    }
  };

  // Auth state: exchange code or restore session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(window.location.search)
        .then(({ data }) => { if (data?.session) setUser(data.session.user); })
        .catch(() => {});
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        cleanAuthHash();
      });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session) window.history.replaceState({}, document.title, window.location.pathname);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onHashChange = () => setViewState(getViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!user) return;
    const createdAt  = user.created_at ? new Date(user.created_at).getTime() : 0;
    const isNewUser  = Date.now() - createdAt < 5 * 60 * 1000;
    if (isNewUser) setShowWelcome(true);
  }, [user]);

  useEffect(() => { if (user) fetchMovies(); else setMovies([]); }, [user]);

  // ── Data operations ──
  const fetchMovies = async () => {
    const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: true });
    if (!error) setMovies(data);
  };

  const toggleStatus = async (id, field, val) => {
    const newVal = !val;
    const extra  = field === 'watched' ? { status: newVal ? 'watched' : 'unwatched' } : {};
    setMovies(prev => prev.map(m => m.id === id ? { ...m, [field]: newVal, ...extra } : m));
    await supabase.from('movies').update({ [field]: newVal, ...extra }).eq('id', id);
  };

  const setMovieStatus = async (id, status) => {
    const watched = status === 'watched';
    setMovies(prev => prev.map(m => m.id === id ? { ...m, status, watched } : m));
    await supabase.from('movies').update({ status, watched }).eq('id', id);
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

  const updateEpisodes = async (id, episodes_watched, total_episodes) => {
    setMovies(prev => prev.map(m => m.id === id ? { ...m, episodes_watched, total_episodes } : m));
    await supabase.from('movies').update({ episodes_watched, total_episodes }).eq('id', id);
  };

  // ── Render ──
  if (!user) return <LoginPage />;

  if (view === 'search') {
    const existingTitles = new Set([
      ...movies.map(m => (m.title || '').toLowerCase() + ':lib'),
      ...movies.filter(m => m.status === 'watchlist').map(m => (m.title || '').toLowerCase() + ':wl'),
    ]);
    return (
      <div className="view-enter">
        <SearchPage onBack={() => setView('library')} onAdded={fetchMovies} existingTitles={existingTitles} />
      </div>
    );
  }

  return (
    <>
      <AmbientBackground movie={nowWatchingMovie} />

      <DrawerMenu
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        user={user} onLogout={() => supabase.auth.signOut()}
        onOpenSeed={() => setShowSeed(true)}
        theme={theme}
        onToggleTheme={() => setTheme(v => v === 'dark' ? 'light' : v === 'light' ? 'maestro' : 'dark')}
      />

      {view === 'library' && (
        <div key="library" className="view-enter">
          <LibraryPage
            movies={movies} onToggle={toggleStatus} onRate={rateMovie}
            onDelete={deleteMovie} onLogout={() => supabase.auth.signOut()}
            onOpenSeed={() => setShowSeed(true)} user={user}
            onOpenDrawer={() => setDrawerOpen(true)}
            onEpisodeUpdate={updateEpisodes} onSetStatus={setMovieStatus}
            nowWatchingId={nowWatchingId} onSetNowWatching={setNowWatching}
          />
        </div>
      )}

      {view === 'stats' && (
        <div key="stats" className="view-enter">
          <StatsPage movies={movies} />
        </div>
      )}

      {view === 'flickscient' && (
        <div key="flickscient" className="view-enter min-h-screen pt-0 pb-20" style={{ background: '#0a0a0f' }}>
          <FlickScient myList={movies} onLibraryUpdate={fetchMovies} />
        </div>
      )}

      <BottomNav view={view} setView={setView} />

      {showSeed && <SeedModal userId={user.id} onClose={() => setShowSeed(false)} onDone={fetchMovies} />}

      {showWelcome && (
        <WelcomeModal user={user} onDismiss={() => setShowWelcome(false)} />
      )}
    </>
  );
}
