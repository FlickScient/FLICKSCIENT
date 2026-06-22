// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Search, Film, Globe, Users, Zap, X, RefreshCw,
  Bookmark, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MovieDetailSheet } from '../FlickScient';
import ResultCard from '../components/ResultCard';
import {
  TMDB_GENRES, GENRE_ID_MAP, GENRE_ICONS, INDUSTRIES,
  LANG_TO_INDUSTRY, ALL_GENRES, genreColor, detectIndustry,
  TMDB_IMG, tmdb,
} from '../lib/constants';

export default function SearchPage({ onBack, onAdded, existingTitles }) {
  const [tab, setTab]           = useState('discover');
  const [addedLib, setAddedLib] = useState(new Set());
  const [addedWL,  setAddedWL]  = useState(new Set());

  const [query,         setQuery]         = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [activeGenres,     setActiveGenres]     = useState([]);
  const [activeIndustries, setActiveIndustries] = useState([]);
  const [mediaTypeFilter,  setMediaTypeFilter]  = useState('all');

  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [activeBrowse,  setActiveBrowse]  = useState(null);
  const [browsePage,    setBrowsePage]    = useState(1);

  const [dirQuery,         setDirQuery]         = useState('');
  const [dirResults,       setDirResults]       = useState([]);
  const [dirLoading,       setDirLoading]       = useState(false);
  const [selectedDir,      setSelectedDir]      = useState(null);
  const [dirMovies,        setDirMovies]        = useState([]);
  const [dirMoviesLoading, setDirMoviesLoading] = useState(false);

  const [trending,        setTrending]        = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const [selectedPreview, setSelectedPreview] = useState(null);

  const isAddedLib = (item) => addedLib.has(item.id) || existingTitles.has((item.title || item.name || '').toLowerCase() + ':lib');
  const isAddedWL  = (item) => addedWL.has(item.id)  || existingTitles.has((item.title || item.name || '').toLowerCase() + ':wl');
  const isAnyAdded = (item) => isAddedLib(item) || isAddedWL(item);

  useEffect(() => { if (tab === 'discover') loadTrending(); }, [tab]);

  const loadTrending = async () => {
    setTrendingLoading(true);
    try {
      const [movData, tvData] = await Promise.all([
        tmdb('/trending/movie/day?page=1'),
        tmdb('/trending/tv/day?page=1'),
      ]);
      const merged = [
        ...(movData.results || []).map(m => ({ ...m, _mt: 'Movie' })),
        ...(tvData.results  || []).map(m => ({ ...m, _mt: 'Series' })),
      ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      setTrending(merged);
    } catch (_) {}
    setTrendingLoading(false);
  };

  const addToLibrary = async (item, type, status = 'unwatched') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('You must be logged in.'); return; }
    const genre    = item.genre_ids?.[0] ? TMDB_GENRES[item.genre_ids[0]] || null : null;
    const industry = detectIndustry(item.original_language);
    const payload = {
      user_id: user.id,
      title:   item.title || item.name,
      year:    (item.release_date || item.first_air_date || '').split('-')[0],
      type:    type || (item.media_type === 'tv' ? 'Series' : 'Movie'),
      poster:  item.poster_path ? TMDB_IMG(item.poster_path, 'w200') : null,
      watched: false, favorite: false, status,
    };
    if (genre)    payload.genre    = genre;
    if (industry) payload.industry = industry;
    if (item.id)  payload.tmdb_id  = item.id;

    const { data: existing } = await supabase
      .from('movies').select('id')
      .eq('user_id', user.id)
      .ilike('title', payload.title.trim())
      .maybeSingle();

    if (existing) {
      if (status === 'watchlist') setAddedWL(prev => new Set([...prev, item.id]));
      else setAddedLib(prev => new Set([...prev, item.id]));
      return;
    }

    const { error } = await supabase.from('movies').insert([payload]);
    if (error) { alert('Could not add: ' + error.message); return; }

    if (status === 'watchlist') setAddedWL(prev => new Set([...prev, item.id]));
    else                        setAddedLib(prev => new Set([...prev, item.id]));
    onAdded();
  };

  const fetchFilteredResults = async () => {
    setSearchLoading(true);
    const mt = mediaTypeFilter === 'tv' ? 'tv' : 'movie';
    try {
      const genreIds     = activeGenres.map(g => GENRE_ID_MAP[g]).filter(Boolean).join(',');
      const industryLangs = activeIndustries.length > 0
        ? activeIndustries.map(ind => INDUSTRIES.find(i => i.label === ind)?.langs?.[0] || '').filter(Boolean)
        : [''];
      const requests = industryLangs.map(lang => {
        let url = `/discover/${mt}?sort_by=vote_count.desc&vote_count.gte=50&page=1`;
        if (genreIds) url += `&with_genres=${genreIds}`;
        if (lang)     url += `&with_original_language=${lang}`;
        return tmdb(url);
      });
      const responses  = await Promise.all(requests);
      const allResults = responses.flatMap(data => (data.results || []).map(m => ({ ...m, media_type: mt })));
      const seen = new Set();
      const unique = allResults.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      unique.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      setSearchResults(unique);
    } catch (_) {}
    setSearchLoading(false);
  };

  useEffect(() => {
    if (query.trim()) return;
    if (activeGenres.length === 0 && activeIndustries.length === 0 && mediaTypeFilter === 'all') {
      setSearchResults([]);
      return;
    }
    fetchFilteredResults();
  }, [activeGenres, activeIndustries, mediaTypeFilter, query]);

  const doSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true);
    const data = await tmdb(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false`);
    let res = (data.results || []).filter(r => r.media_type !== 'person');
    if (mediaTypeFilter === 'movie') res = res.filter(r => r.media_type === 'movie');
    if (mediaTypeFilter === 'tv')    res = res.filter(r => r.media_type === 'tv');
    setSearchResults(res);
    setSearchLoading(false);
  };

  const browseGenre = async (genreName, page = 1) => {
    const genreId = GENRE_ID_MAP[genreName];
    setActiveBrowse({ type: 'genre', label: genreName });
    setBrowseLoading(true); setBrowsePage(page);
    if (page === 1) setBrowseResults([]);
    const data = await tmdb(`/discover/movie?with_genres=${genreId}&sort_by=vote_count.desc&page=${page}`);
    if (page === 1) setBrowseResults(data.results || []);
    else setBrowseResults(prev => [...prev, ...(data.results || [])]);
    setBrowseLoading(false);
  };

  const browseIndustry = async (industry, page = 1) => {
    setActiveBrowse({ type: 'industry', label: industry.label, langs: industry.langs });
    setBrowseLoading(true); setBrowsePage(page);
    if (page === 1) setBrowseResults([]);
    const lang = industry.langs?.[0] || industry.lang;
    const data = await tmdb(`/discover/movie?with_original_language=${lang}&sort_by=vote_count.desc&page=${page}`);
    if (page === 1) setBrowseResults(data.results || []);
    else setBrowseResults(prev => [...prev, ...(data.results || [])]);
    setBrowseLoading(false);
  };

  const searchDirector = async (e) => {
    e.preventDefault();
    if (!dirQuery.trim()) return;
    setDirLoading(true); setSelectedDir(null); setDirMovies([]);
    const data = await tmdb(`/search/person?query=${encodeURIComponent(dirQuery)}`);
    setDirResults((data.results || []).slice(0, 6));
    setDirLoading(false);
  };

  const loadDirectorFilms = async (person) => {
    setSelectedDir(person); setDirMoviesLoading(true); setDirMovies([]);
    const data = await tmdb(`/person/${person.id}/combined_credits`);
    const directed = (data.crew || []).filter(c => c.job === 'Director' && c.poster_path)
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    setDirMovies(directed); setDirMoviesLoading(false);
  };

  const toggleGenre = (g) => setActiveGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const toggleInd   = (i) => setActiveIndustries(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const TABS = [
    { id: 'discover', icon: <Zap size={15} />,    label: 'Hot' },
    { id: 'search',   icon: <Search size={15} />, label: 'Search' },
    { id: 'genre',    icon: <Film size={15} />,    label: 'Genre' },
    { id: 'industry', icon: <Globe size={15} />,   label: 'Industry' },
    { id: 'director', icon: <Users size={15} />,   label: 'Director' },
  ];

  const FilterChip = ({ active, onClick, children }) => (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
        active ? 'bg-yellow-500 text-black shadow-md' : 'bg-[#1c1c26] text-gray-400 border border-white/10 hover:text-gray-200'
      }`}>{children}</button>
  );

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

      {/* Discover */}
      {tab === 'discover' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-black">Trending Today</p>
              <p className="text-[10px] text-gray-700 mt-0.5">Updated daily · Movies & Series</p>
            </div>
            <button onClick={() => loadTrending()}
              className="flex items-center gap-1.5 text-[10px] text-yellow-600 font-bold border border-yellow-600/30 px-3 py-1.5 rounded-full hover:bg-yellow-500/10 transition-colors">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {trendingLoading && (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex bg-[#16161d] p-3 rounded-2xl gap-3 border border-white/5 items-center animate-pulse">
                  <div className="w-12 h-[72px] bg-[#1c1c26] rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-[#1c1c26] rounded w-3/4" /><div className="h-2 bg-[#1c1c26] rounded w-1/3" /></div>
                </div>
              ))}
            </div>
          )}

          {!trendingLoading && trending.length > 0 && (
            <>
              {(() => {
                const h      = trending[0];
                const hTitle = h.title || h.name;
                const hYear  = (h.release_date || h.first_air_date || '').split('-')[0];
                const hGenre = h.genre_ids?.[0] ? TMDB_GENRES[h.genre_ids[0]] : null;
                return (
                  <div className="relative rounded-3xl overflow-hidden mb-4 border border-white/10">
                    {h.backdrop_path && <img src={TMDB_IMG(h.backdrop_path, 'w780')} className="w-full h-40 object-cover" alt="" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                      <div>
                        <div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">🔥 #1 Trending</div>
                        <p className="text-base font-black text-white leading-tight">{hTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {hYear  && <span className="text-xs text-yellow-400 font-bold">{hYear}</span>}
                          {hGenre && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${genreColor(hGenre)}`}>{hGenre}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => !isAnyAdded(h) && addToLibrary(h, h._mt, 'watchlist')}
                          className={`text-xs font-black px-3 py-2 rounded-xl transition-all flex items-center gap-1 ${
                            isAddedWL(h) ? 'bg-blue-900/60 text-blue-400' :
                            isAddedLib(h) ? 'bg-[#1c1c26] text-gray-600 cursor-not-allowed' :
                            'bg-white/10 text-white hover:bg-white/20'
                          }`}>
                          <Bookmark size={13} fill={isAddedWL(h) ? 'currentColor' : 'none'} />
                          {isAddedWL(h) ? 'Saved' : 'Save'}
                        </button>
                        <button onClick={() => !isAnyAdded(h) && addToLibrary(h, h._mt)}
                          className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${
                            isAddedLib(h) ? 'bg-green-900/60 text-green-400' :
                            isAddedWL(h)  ? 'bg-[#1c1c26] text-gray-600 cursor-not-allowed' :
                            'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95'
                          }`}>
                          {isAddedLib(h) ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                {trending.slice(1).map((item, i) => (
                  <div key={item.id} className="flex bg-[#16161d] p-3 rounded-2xl gap-3 border border-white/5 items-center">
                    <span className="text-[11px] font-black text-gray-700 w-5 text-center flex-shrink-0">#{i + 2}</span>
                    {item.poster_path
                      ? <img src={TMDB_IMG(item.poster_path, 'w200')} className="w-11 h-[66px] object-cover rounded-xl flex-shrink-0" alt="" />
                      : <div className="w-11 h-[66px] bg-[#1c1c26] rounded-xl flex-shrink-0 flex items-center justify-center"><Film size={14} className="text-gray-700" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.title || item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-yellow-600 font-bold">{(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                        <span className="text-[9px] text-gray-600 uppercase">{item._mt}</span>
                        {item.vote_average > 0 && <span className="text-[9px] text-gray-600">⭐ {item.vote_average.toFixed(1)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => !isAnyAdded(item) && addToLibrary(item, item._mt, 'watchlist')}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          isAddedWL(item) ? 'bg-blue-900/40 text-blue-400' :
                          isAddedLib(item) ? 'bg-[#1c1c26] text-gray-700 cursor-not-allowed' :
                          'bg-[#1c1c26] border border-white/10 text-gray-500 hover:text-blue-400'
                        }`}>
                        <Bookmark size={13} fill={isAddedWL(item) ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => !isAnyAdded(item) && addToLibrary(item, item._mt)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                          isAddedLib(item) ? 'bg-green-900/40 text-green-400' :
                          isAddedWL(item)  ? 'bg-[#1c1c26] text-gray-700 cursor-not-allowed' :
                          'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95'
                        }`}>
                        {isAddedLib(item) ? '✓' : '+'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search */}
      {tab === 'search' && (
        <div className="p-4">
          <form onSubmit={doSearch} className="relative mb-3">
            <Search className="absolute left-4 top-4 text-gray-500" size={18} />
            <input type="text" placeholder="Search movies or series..." value={query} onChange={e => setQuery(e.target.value)}
              className="w-full bg-[#1c1c26] p-4 pl-11 pr-16 rounded-2xl border border-gray-800 outline-none focus:border-yellow-500/60 text-sm transition-colors" />
            <button type="submit" className="absolute right-3 top-2.5 bg-yellow-500 text-black text-xs font-black px-3 py-1.5 rounded-xl">Go</button>
          </form>

          <div className="flex gap-2 mb-3">
            {[['all','All'],['movie','Movies'],['tv','TV Shows']].map(([v, l]) => (
              <button key={v} onClick={() => setMediaTypeFilter(v)}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                  mediaTypeFilter === v ? 'bg-yellow-500 text-black' : 'bg-[#1c1c26] text-gray-500 border border-white/10'
                }`}>{l}</button>
            ))}
          </div>

          <div className="mb-3 space-y-2">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-600 font-black mb-1.5">Genre</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {ALL_GENRES.slice(0, 12).map(g => (
                  <FilterChip key={g} active={activeGenres.includes(g)} onClick={() => toggleGenre(g)}>
                    {GENRE_ICONS[g]} {g}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-600 font-black mb-1.5">Industry</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {INDUSTRIES.map(ind => (
                  <FilterChip key={ind.label} active={activeIndustries.includes(ind.label)} onClick={() => toggleInd(ind.label)}>
                    {ind.flag} {ind.label}
                  </FilterChip>
                ))}
              </div>
            </div>
            {(activeGenres.length > 0 || activeIndustries.length > 0) && (
              <button onClick={() => { setActiveGenres([]); setActiveIndustries([]); }}
                className="text-[9px] text-gray-600 hover:text-yellow-500 font-bold transition-colors">
                ✕ Clear filters
              </button>
            )}
          </div>

          {searchLoading && <p className="text-center text-gray-500 text-sm py-8">Searching…</p>}
          <div className="space-y-3">
            {searchResults
              .filter(item => {
                const itemGenres   = (item.genre_ids || []).map(id => TMDB_GENRES[id]).filter(Boolean);
                const itemIndustry = LANG_TO_INDUSTRY[item.original_language] || null;
                if (activeGenres.length > 0 && !activeGenres.some(g => itemGenres.includes(g))) return false;
                if (activeIndustries.length > 0 && !activeIndustries.includes(itemIndustry)) return false;
                return true;
              })
              .map(item => (
                <ResultCard key={item.id} item={item}
                  addedWatched={isAddedLib(item)} addedWatchlist={isAddedWL(item)}
                  onAdd={addToLibrary} onWatchlist={(i, t) => addToLibrary(i, t, 'watchlist')}
                  onPreview={title => setSelectedPreview(title)} />
              ))}
          </div>
          {!searchLoading && searchResults.length === 0 && query && (
            <p className="text-center text-gray-600 text-sm py-10">No results found</p>
          )}
          {!searchLoading && searchResults.length === 0 && !query && (activeGenres.length === 0 && activeIndustries.length === 0 && mediaTypeFilter === 'all') && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={36} className="text-gray-800 mb-3" />
              <p className="text-gray-600 text-sm font-bold">Search or pick a filter to browse</p>
              <p className="text-gray-700 text-xs mt-1">Type a title above, or select genre / industry chips</p>
            </div>
          )}
        </div>
      )}

      {/* Genre */}
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
                <button onClick={() => { setActiveBrowse(null); setBrowseResults([]); }} className="text-gray-400 hover:text-white text-xs font-bold">← Back</button>
                <span className="text-sm font-black">{GENRE_ICONS[activeBrowse.label]} {activeBrowse.label}</span>
              </div>
              {browseLoading && browseResults.length === 0 && <p className="text-center text-gray-500 text-sm py-8">Loading…</p>}
              <div className="space-y-3">
                {browseResults.map(item => (
                  <ResultCard key={item.id} item={item} mediaType="Movie"
                    addedWatched={isAddedLib(item)} addedWatchlist={isAddedWL(item)}
                    onAdd={(i, t) => addToLibrary(i, t)} onWatchlist={(i, t) => addToLibrary(i, t, 'watchlist')}
                    onPreview={title => setSelectedPreview(title)} />
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

      {/* Industry */}
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
                <button onClick={() => { setActiveBrowse(null); setBrowseResults([]); }} className="text-gray-400 hover:text-white text-xs font-bold">← Back</button>
                <span className="text-sm font-black">
                  {INDUSTRIES.find(i => i.label === activeBrowse.label)?.flag} {activeBrowse.label}
                </span>
              </div>
              {browseLoading && browseResults.length === 0 && <p className="text-center text-gray-500 text-sm py-8">Loading…</p>}
              <div className="space-y-3">
                {browseResults.map(item => (
                  <ResultCard key={item.id} item={item} mediaType="Movie"
                    addedWatched={isAddedLib(item)} addedWatchlist={isAddedWL(item)}
                    onAdd={(i, t) => addToLibrary(i, t)} onWatchlist={(i, t) => addToLibrary(i, t, 'watchlist')}
                    onPreview={title => setSelectedPreview(title)} />
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

      {/* Director */}
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
                ? <img src={TMDB_IMG(person.profile_path, 'w185')} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                : <div className="w-10 h-10 rounded-full bg-[#1c1c26] flex items-center justify-center flex-shrink-0"><Users size={14} className="text-gray-600" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{person.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{person.known_for?.slice(0, 2).map(k => k.title || k.name).join(', ')}</p>
              </div>
              <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
            </button>
          ))}
          {selectedDir && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { setSelectedDir(null); setDirMovies([]); }} className="text-gray-400 hover:text-white text-xs font-bold">← Back</button>
                {selectedDir.profile_path && <img src={TMDB_IMG(selectedDir.profile_path, 'w185')} className="w-8 h-8 rounded-full object-cover" alt="" />}
                <span className="text-sm font-black">{selectedDir.name}</span>
              </div>
              {dirMoviesLoading && <p className="text-center text-gray-500 text-sm py-8">Loading filmography…</p>}
              <div className="space-y-3">
                {dirMovies.map(item => (
                  <ResultCard key={`${item.id}-${item.media_type}`} item={item}
                    mediaType={item.media_type === 'tv' ? 'Series' : 'Movie'}
                    addedWatched={isAddedLib(item)} addedWatchlist={isAddedWL(item)}
                    onAdd={(i, t) => addToLibrary(i, t)} onWatchlist={(i, t) => addToLibrary(i, t, 'watchlist')}
                    onPreview={title => setSelectedPreview(title)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedPreview && (
        <MovieDetailSheet
          title={selectedPreview}
          myList={[]}
          onClose={() => setSelectedPreview(null)}
        />
      )}
    </div>
  );
}
