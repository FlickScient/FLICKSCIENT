// @ts-nocheck
import { useState } from 'react';
import {
  Search, Heart, CheckCircle, Film, Trash2, ArrowUp,
  SlidersHorizontal, Bookmark,
} from 'lucide-react';
import MovieDetailModal from '../components/MovieDetailModal';
import StarRating from '../components/StarRating';
import NowWatchingBanner from '../components/NowWatching';
import {
  INDUSTRIES, ALL_GENRES, ALL_INDUSTRIES, SORT_OPTIONS,
  GENRE_ICONS, genreColor,
} from '../lib/constants';

export default function LibraryPage({ movies, onToggle, onDelete, onRate, onLogout, onOpenSeed, user, onOpenDrawer, onEpisodeUpdate, onSetStatus, nowWatchingId, onSetNowWatching }) {
  const [libSearch,        setLibSearch]        = useState('');
  const [statusFilter,     setStatusFilter]     = useState('all');
  const [mediaTypeFilter,  setMediaTypeFilter]  = useState('all');
  const [activeGenres,     setActiveGenres]     = useState([]);
  const [activeIndustries, setActiveIndustries] = useState([]);
  const [sortBy,           setSortBy]           = useState('added');
  const [showSort,         setShowSort]         = useState(false);
  const [selectedMovie,    setSelectedMovie]    = useState(null);

  const email    = user?.email || '';
  const initials = email ? email[0].toUpperCase() : '?';

  const total        = movies.length;
  const watched      = movies.filter(m => m.watched || m.status === 'watched').length;
  const watchlistCnt = movies.filter(m => m.status === 'watchlist').length;
  const pct          = total > 0 ? Math.round((watched / total) * 100) : 0;
  const first100     = movies.slice(0, 100);
  const next100      = movies.slice(100, 200);
  const watchedFirst = first100.filter(m => m.watched || m.status === 'watched').length;
  const watchedNext  = next100.filter(m => m.watched || m.status === 'watched').length;

  const toggleGenre = (g) => setActiveGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const toggleInd   = (i) => setActiveIndustries(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  let filtered = movies.filter((m) => {
    if (statusFilter === 'watched'   && !(m.watched || m.status === 'watched')) return false;
    if (statusFilter === 'unwatched' && (m.watched || m.status === 'watched' || m.status === 'watchlist')) return false;
    if (statusFilter === 'watchlist' && m.status !== 'watchlist') return false;
    if (statusFilter === 'favorites' && !m.favorite) return false;
    if (mediaTypeFilter === 'movie' && m.type !== 'Movie')  return false;
    if (mediaTypeFilter === 'tv'    && m.type !== 'Series') return false;
    if (activeGenres.length > 0 && !activeGenres.includes(m.genre)) return false;
    if (activeIndustries.length > 0 && !activeIndustries.includes(m.industry)) return false;
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

  const Chip = ({ active, onClick, children, activeClass = 'bg-[#EAB308] text-black' }) => (
    <button onClick={onClick}
      className={`px-3.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${active ? activeClass : ''}`}
      style={active ? {} : { background: '#0d0d14', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(234,179,8,0.14)' }}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen text-white pb-28" style={{ background: '#0a0a0f' }}>
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onToggle={(id, field, val) => {
            onToggle(id, field, val);
            setSelectedMovie(prev => {
              if (!prev) return null;
              const newVal = !val;
              const extra = field === 'watched' ? { status: newVal ? 'watched' : 'unwatched' } : {};
              return { ...prev, [field]: newVal, ...extra };
            });
          }}
          onSetStatus={(id, status) => {
            onSetStatus(id, status);
            setSelectedMovie(prev => prev ? { ...prev, status, watched: status === 'watched' } : null);
          }}
          onRate={(id, rating) => { onRate(id, rating); setSelectedMovie(prev => prev ? { ...prev, rating } : null); }}
          onDelete={(id) => { onDelete(id); setSelectedMovie(null); }}
          onEpisodeUpdate={(id, ep, tot) => { onEpisodeUpdate(id, ep, tot); setSelectedMovie(prev => prev ? { ...prev, episodes_watched: ep, total_episodes: tot } : null); }}
          nowWatchingId={nowWatchingId}
          onSetNowWatching={onSetNowWatching}
        />
      )}

      {/* Header */}
      <div className="pt-10 pb-5 px-5 border-b" style={{ background: '#0d0d14', borderColor: 'rgba(234,179,8,0.12)' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onOpenDrawer} className="p-1 rounded-xl transition-opacity hover:opacity-70">
              <img src="/favicon.svg" width={36} height={36} alt="logo" />
            </button>
            <div>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.03em', color: '#fff', lineHeight: 1.1 }}>
                Movie<span style={{ color: '#EAB308' }}>Sync</span>
              </h1>
              <p style={{ fontSize: '0.52rem', textTransform: 'uppercase', letterSpacing: '0.28em', color: 'rgba(234,179,8,0.45)', fontFamily: "'Cinzel', serif", marginTop: 2 }}>
                The Ultimate Canon
              </p>
            </div>
          </div>
          <button onClick={onOpenDrawer}
            className="w-10 h-10 rounded-full flex items-center justify-center text-black text-sm font-black flex-shrink-0 transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #EAB308 0%, #ca9a07 100%)', boxShadow: '0 0 16px rgba(234,179,8,0.4)' }}>
            {initials}
          </button>
        </div>

        <div className="flex gap-5 mb-4">
          {[
            { val: watchedFirst, total: first100.length || 100, label: 'First 100' },
            { val: watchedNext,  total: next100.length  || 100, label: 'Next 100' },
            { val: watched,      total,                          label: 'Total' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-black" style={{ color: '#EAB308', textShadow: '0 0 10px rgba(234,179,8,0.45)' }}>
                {s.val}<span className="text-xs font-normal" style={{ color: 'rgba(255,255,255,0.25)' }}>/{s.total}</span>
              </div>
              <div className="text-[8px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{s.label}</div>
            </div>
          ))}
          <div className="text-center ml-auto">
            <div className="text-xl font-black text-blue-400">{watchlistCnt}</div>
            <div className="text-[8px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Watchlist</div>
          </div>
        </div>

        <div className="flex justify-between text-[9px] mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>{watched} watched</span>
          <span style={{ color: '#EAB308', fontWeight: 800 }}>{pct}%</span>
          <span>{total - watched} remaining</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1c1c2a' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #EAB308, #fde047)', boxShadow: '0 0 8px rgba(234,179,8,0.55)' }} />
        </div>
      </div>

      {/* Sticky Filters */}
      <div className="sticky top-0 z-40 backdrop-blur-md pt-3 pb-2 border-b" style={{ background: 'rgba(10,10,15,0.96)', borderColor: 'rgba(234,179,8,0.08)' }}>
        <div className="px-4 mb-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3" size={15} style={{ color: 'rgba(255,255,255,0.25)' }} />
            <input type="text" placeholder="Search library..." value={libSearch} onChange={e => setLibSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-2xl border outline-none text-sm text-white transition-all"
              style={{ background: '#0d0d14', borderColor: 'rgba(234,179,8,0.15)', caretColor: '#EAB308' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(234,179,8,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234,179,8,0.08)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(234,179,8,0.15)'; e.currentTarget.style.boxShadow = 'none'; }} />
          </div>
          <div className="relative">
            <button onClick={() => setShowSort(s => !s)}
              className="h-full px-3 rounded-2xl border flex items-center gap-1 transition-all"
              style={{ background: sortBy !== 'added' ? 'rgba(234,179,8,0.1)' : '#0d0d14', borderColor: sortBy !== 'added' ? 'rgba(234,179,8,0.4)' : 'rgba(234,179,8,0.15)', color: sortBy !== 'added' ? '#EAB308' : 'rgba(255,255,255,0.3)' }}>
              <SlidersHorizontal size={15} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden shadow-2xl w-36 z-50" style={{ background: '#0d0d14', border: '1px solid rgba(234,179,8,0.2)' }}>
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => { setSortBy(o.value); setShowSort(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold transition-colors"
                    style={{ color: sortBy === o.value ? '#EAB308' : 'rgba(255,255,255,0.4)', background: sortBy === o.value ? 'rgba(234,179,8,0.08)' : 'transparent' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="h-full px-3 rounded-2xl border flex items-center transition-all hover:opacity-70"
            style={{ background: '#0d0d14', borderColor: 'rgba(234,179,8,0.15)', color: 'rgba(255,255,255,0.3)' }}>
            <ArrowUp size={15} />
          </button>
        </div>

        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide mb-2">
          <Chip active={statusFilter === 'all'}       onClick={() => setStatusFilter('all')}>All</Chip>
          <Chip active={statusFilter === 'watched'}   onClick={() => setStatusFilter('watched')}>✓ Watched</Chip>
          <Chip active={statusFilter === 'watchlist'} onClick={() => setStatusFilter('watchlist')} activeClass="bg-blue-600 text-white">🔖 Watchlist</Chip>
          <Chip active={statusFilter === 'unwatched'} onClick={() => setStatusFilter('unwatched')}>Unwatched</Chip>
          <Chip active={statusFilter === 'favorites'} onClick={() => setStatusFilter('favorites')}>❤️ Faves</Chip>
          <div className="w-px h-5 self-center mx-1 flex-shrink-0" style={{ background: 'rgba(234,179,8,0.15)' }} />
          <Chip active={mediaTypeFilter === 'all'}   onClick={() => setMediaTypeFilter('all')}   activeClass="bg-[#2c2c3a] text-white">All</Chip>
          <Chip active={mediaTypeFilter === 'movie'} onClick={() => setMediaTypeFilter('movie')} activeClass="bg-[#2c2c3a] text-white">🎬 Movies</Chip>
          <Chip active={mediaTypeFilter === 'tv'}    onClick={() => setMediaTypeFilter('tv')}    activeClass="bg-[#2c2c3a] text-white">📺 Series</Chip>
        </div>

        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide mb-2">
          {ALL_INDUSTRIES.map(ind => {
            const info   = INDUSTRIES.find(i => i.label === ind);
            const active = activeIndustries.includes(ind);
            return (
              <Chip key={ind} active={active} onClick={() => toggleInd(ind)} activeClass="bg-[#EAB308] text-black">
                {info?.flag ? `${info.flag} ${ind}` : ind}
              </Chip>
            );
          })}
          {activeIndustries.length > 0 && <Chip active={false} onClick={() => setActiveIndustries([])}>✕ Clear</Chip>}
        </div>

        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {ALL_GENRES.map(g => (
            <Chip key={g} active={activeGenres.includes(g)} onClick={() => toggleGenre(g)}>
              {GENRE_ICONS[g] || ''} {g}
            </Chip>
          ))}
          {activeGenres.length > 0 && <Chip active={false} onClick={() => setActiveGenres([])}>✕ Clear</Chip>}
        </div>
      </div>

      {/* Now Watching Banner */}
      {nowWatchingId && (() => {
        const nwMovie = movies.find(m => m.id === nowWatchingId);
        if (!nwMovie) return null;
        return (
          <div className="pt-3">
            <NowWatchingBanner
              movie={nwMovie}
              onClear={() => onSetNowWatching(null)}
              onEpisodeUpdate={onEpisodeUpdate}
            />
          </div>
        );
      })()}

      {/* Movie list */}
      <div className="px-4 pt-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">
          {filtered.length} film{filtered.length !== 1 ? 's' : ''}
          {(activeGenres.length > 0 || activeIndustries.length > 0) && (
            <span className="ml-2 text-yellow-700">· Filtered</span>
          )}
        </p>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Film size={36} className="text-gray-800 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No films found</p>
            {movies.length === 0
              ? <div className="mt-4">
                  <p className="text-gray-700 text-xs mb-4">Start by importing 500 popular films</p>
                  <button onClick={onOpenSeed} className="bg-yellow-500 text-black text-xs font-black px-6 py-3 rounded-2xl hover:bg-yellow-400 transition-colors">Import 500 Films</button>
                </div>
              : <p className="text-gray-700 text-xs mt-1">Try adjusting your filters</p>
            }
          </div>
        )}

        <div className="space-y-2.5">
          {filtered.map((movie) => {
            const rankNum     = movies.indexOf(movie) + 1;
            const indInfo     = INDUSTRIES.find(i => i.label === movie.industry);
            const isWatchlist = movie.status === 'watchlist';
            const isWatched   = movie.watched || movie.status === 'watched';
            const epPct       = movie.type === 'Series' && movie.total_episodes
              ? Math.round(((movie.episodes_watched || 0) / movie.total_episodes) * 100) : 0;

            return (
              <div key={movie.id}
                className="flex rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.99]"
                style={{ background: '#0d0d14', border: '1px solid rgba(234,179,8,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(234,179,8,0.28)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(234,179,8,0.07), 0 2px 12px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(234,179,8,0.08)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.4)'; }}
                onClick={() => setSelectedMovie(movie)}>
                <div className="w-16 flex-shrink-0 relative">
                  {movie.poster
                    ? <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" style={{ minHeight: 96 }} />
                    : <div className="w-full h-full min-h-[96px] flex items-center justify-center" style={{ background: '#1c1c28' }}>
                        <Film size={20} style={{ color: 'rgba(234,179,8,0.2)' }} />
                      </div>
                  }
                  <div className="absolute top-1 left-1 rounded-md px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.75)' }}>
                    <span className="text-[9px] text-gray-400 font-mono">{rankNum}</span>
                  </div>
                  {isWatchlist && (
                    <div className="absolute bottom-1 left-1 rounded-md px-1 py-0.5" style={{ background: 'rgba(37,99,235,0.8)' }}>
                      <Bookmark size={8} className="text-white" fill="white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between">
                  <div>
                    <h3 className={`font-bold text-sm leading-snug ${isWatched ? 'line-through' : ''}`}
                      style={{ color: isWatched ? 'rgba(255,255,255,0.28)' : isWatchlist ? '#93c5fd' : '#fff' }}>
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {movie.year && <span className="text-xs font-bold" style={{ color: '#EAB308' }}>{movie.year}</span>}
                      {movie.type && <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.28)' }}>{movie.type}</span>}
                      {indInfo && <span className="text-[9px]">{indInfo.flag}</span>}
                      {movie.genre && <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${genreColor(movie.genre)}`}>{movie.genre}</span>}
                    </div>
                    {movie.type === 'Series' && movie.total_episodes > 0 && (
                      <div className="mt-1.5">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.28)' }}>{movie.episodes_watched || 0}/{movie.total_episodes} ep</span>
                          <span className="text-[8px] font-bold" style={{ color: '#EAB308' }}>{epPct}%</span>
                        </div>
                        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: '#1c1c28' }}>
                          <div className="h-full rounded-full" style={{ width: `${epPct}%`, background: '#EAB308' }} />
                        </div>
                      </div>
                    )}
                    <div className="mt-1.5">
                      <StarRating value={movie.rating || 0} onChange={val => { onRate(movie.id, val); }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                    {isWatchlist ? (
                      <button onClick={() => onToggle(movie.id, 'watched', false)}
                        className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                        style={{ background: 'rgba(234,179,8,0.1)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }}>
                        <CheckCircle size={12} /> Mark Watched
                      </button>
                    ) : (
                      <button onClick={() => onToggle(movie.id, 'watched', movie.watched)}
                        className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                        style={{ background: isWatched ? 'rgba(34,197,94,0.1)' : '#1c1c28', color: isWatched ? '#4ade80' : 'rgba(255,255,255,0.3)', border: `1px solid ${isWatched ? 'rgba(34,197,94,0.25)' : 'transparent'}` }}>
                        <CheckCircle size={12} strokeWidth={2.5} />
                        {isWatched ? 'Watched' : 'Mark Watched'}
                      </button>
                    )}
                    <button onClick={() => onToggle(movie.id, 'favorite', movie.favorite)}
                      className="transition-colors"
                      style={{ color: movie.favorite ? '#ef4444' : 'rgba(255,255,255,0.18)' }}>
                      <Heart size={16} fill={movie.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => onDelete(movie.id)} className="ml-auto transition-colors hover:text-red-400"
                      style={{ color: 'rgba(255,255,255,0.15)' }}>
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
