// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  X, Clock, User, Heart, CheckCircle, Bookmark, Trash2,
  PlayCircle, Star, Tv2,
} from 'lucide-react';
import { INDUSTRIES, genreColor, TMDB_IMG, tmdb } from '../lib/constants';

export default function MovieDetailModal({ movie, onClose, onToggle, onRate, onDelete, onEpisodeUpdate, onSetStatus, nowWatchingId, onSetNowWatching }) {
  const [details,     setDetails]     = useState(null);
  const [cast,        setCast]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [epInput,     setEpInput]     = useState(movie.episodes_watched || 0);
  const [posterColor, setPosterColor] = useState(null);

  useEffect(() => {
    fetchDetails();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const src = movie.poster;
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 40; c.height = 60;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 40, 60);
        const d = ctx.getImageData(0, 0, 40, 60).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const br = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (br > 25 && br < 230) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        }
        if (n > 0) setPosterColor(`${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)}`);
      } catch (_) {}
    };
    img.onerror = () => {};
    img.src = src;
  }, [movie.poster]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const mediaType = movie.type === 'Series' ? 'tv' : 'movie';
      let tmdbId = movie.tmdb_id;
      if (!tmdbId) {
        const sRes = await tmdb(`/search/${mediaType}?query=${encodeURIComponent(movie.title)}&year=${movie.year || ''}`);
        tmdbId = sRes.results?.[0]?.id;
      }
      if (!tmdbId) { setLoading(false); return; }
      const [det, cred] = await Promise.all([
        tmdb(`/${mediaType}/${tmdbId}?append_to_response=videos`),
        tmdb(`/${mediaType}/${tmdbId}/credits`),
      ]);
      setDetails(det);
      setCast((cred.cast || []).slice(0, 12));
      if (movie.type === 'Series' && det.number_of_episodes && !movie.total_episodes) {
        onEpisodeUpdate(movie.id, movie.episodes_watched || 0, det.number_of_episodes);
      }
    } catch (_) {}
    setLoading(false);
  };

  const isSeries  = movie.type === 'Series';
  const totalEp   = movie.total_episodes || details?.number_of_episodes || 1;
  const watchedEp = movie.episodes_watched || 0;
  const epPct     = totalEp > 0 ? Math.round((watchedEp / totalEp) * 100) : 0;

  const runtime = details
    ? (details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
      : details.episode_run_time?.[0] ? `~${details.episode_run_time[0]}m/ep`
      : null)
    : null;

  const markNextEp = () => {
    const next = Math.min(watchedEp + 1, totalEp);
    setEpInput(next);
    onEpisodeUpdate(movie.id, next, totalEp);
  };

  const handleEpChange = (val) => {
    const n = Math.max(0, Math.min(parseInt(val) || 0, totalEp));
    setEpInput(n);
    onEpisodeUpdate(movie.id, n, totalEp);
  };

  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 max-h-[92vh] bg-[#111116] rounded-t-3xl overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        {posterColor && (
          <div className="absolute inset-0 rounded-t-3xl pointer-events-none transition-opacity duration-700"
            style={{ background: `radial-gradient(ellipse at top, rgba(${posterColor},0.13) 0%, transparent 60%)`, zIndex: 0 }} />
        )}
        {(details?.backdrop_path || movie.poster) && (
          <div className="relative w-full h-52 flex-shrink-0">
            <img src={details?.backdrop_path ? TMDB_IMG(details.backdrop_path, 'w780') : movie.poster}
              alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>
        )}

        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 z-20">
          <X size={16} />
        </button>

        <div className="px-5 pb-10 -mt-10 relative z-10">
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-xl font-black text-white leading-tight flex-1">{movie.title}</h2>
              {INDUSTRIES.find(i => i.label === movie.industry)?.flag && (
                <span className="text-2xl flex-shrink-0">{INDUSTRIES.find(i => i.label === movie.industry).flag}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {movie.year && <span className="text-yellow-500 font-bold text-sm">{movie.year}</span>}
              {runtime    && <><span className="text-gray-700">·</span><span className="text-gray-400 text-xs flex items-center gap-1"><Clock size={11} />{runtime}</span></>}
              {movie.type && <><span className="text-gray-700">·</span><span className="text-[10px] text-gray-500 uppercase tracking-wider">{movie.type}</span></>}
              {movie.genre && <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${genreColor(movie.genre)}`}>{movie.genre}</span>}
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <button onClick={() => {
                if (movie.status === 'watchlist') onSetStatus(movie.id, 'unwatched');
                else onSetStatus(movie.id, 'watchlist');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                movie.status === 'watchlist' ? 'bg-blue-900/40 text-blue-400 border-blue-800/50' : 'bg-[#1c1c26] text-gray-400 border-white/10 hover:text-blue-400'
              }`}>
              <Bookmark size={14} fill={movie.status === 'watchlist' ? 'currentColor' : 'none'} />
              {movie.status === 'watchlist' ? 'In Watchlist' : 'Watchlist'}
            </button>
            <button onClick={() => onToggle(movie.id, 'watched', movie.watched)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                movie.watched ? 'bg-green-900/50 text-green-400 border-green-800/50' : 'bg-[#1c1c26] text-gray-400 border-white/10 hover:text-white'
              }`}>
              <CheckCircle size={14} />
              {movie.watched ? 'Watched' : 'Mark Watched'}
            </button>
          </div>
          {onSetNowWatching && (
            <div className="mb-3">
              <button
                onClick={() => {
                  const isNow = nowWatchingId === movie.id;
                  onSetNowWatching(isNow ? null : movie.id);
                  if (!isNow) onClose();
                }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                  nowWatchingId === movie.id
                    ? 'bg-purple-900/40 text-purple-300 border-purple-800/50'
                    : 'bg-[#1c1c26] text-gray-400 border-white/10 hover:text-purple-300 hover:border-purple-800/40'
                }`}>
                <Tv2 size={14} />
                {nowWatchingId === movie.id ? '✓ Now Watching' : 'Set as Now Watching'}
              </button>
            </div>
          )}

          <div className="flex gap-2 mb-5">
            <button onClick={() => onToggle(movie.id, 'favorite', movie.favorite)}
              className={`flex-1 px-4 py-2 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-black transition-all ${
                movie.favorite ? 'bg-red-900/30 text-red-400 border-red-800/40' : 'bg-[#1c1c26] text-gray-500 border-white/10 hover:text-red-400'
              }`}>
              <Heart size={14} fill={movie.favorite ? 'currentColor' : 'none'} />
              Favourite
            </button>
            <button onClick={() => { onDelete(movie.id); onClose(); }}
              className="px-4 py-2 rounded-2xl bg-[#1c1c26] border border-white/10 text-gray-600 hover:text-red-500 transition-colors flex items-center gap-1.5 text-xs font-black">
              <Trash2 size={14} /> Remove
            </button>
          </div>

          <div className="bg-[#1c1c26] rounded-2xl p-3 flex items-center justify-between mb-4 border border-white/5">
            <span className="text-xs text-gray-500 font-bold">Your Rating</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => onRate(movie.id, star === movie.rating ? 0 : star)}
                  className={`transition-colors ${star <= (movie.rating||0) ? 'text-yellow-500' : 'text-gray-700'} hover:text-yellow-400`}>
                  <Star size={20} fill={star <= (movie.rating||0) ? 'currentColor' : 'none'} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>

          {isSeries && (
            <div className="bg-[#1c1c26] rounded-2xl p-4 mb-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-white">Episode Progress</p>
                <span className="text-xs text-yellow-500 font-black">{epPct}%</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">{watchedEp} of {totalEp} Episodes</p>
              <div className="w-full h-2 bg-[#0a0a0c] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${epPct}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={markNextEp} disabled={watchedEp >= totalEp}
                  className="flex-1 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black hover:bg-yellow-500/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                  <PlayCircle size={14} /> + Next Episode
                </button>
                <div className="flex items-center gap-1 bg-[#0a0a0c] rounded-xl border border-white/10 px-2 py-1.5">
                  <button onClick={() => handleEpChange(watchedEp - 1)} className="text-gray-500 hover:text-white px-1 text-sm font-black">-</button>
                  <input type="number" value={epInput}
                    onChange={e => handleEpChange(e.target.value)}
                    className="w-10 text-center text-xs font-black bg-transparent text-white outline-none" min={0} max={totalEp} />
                  <button onClick={() => handleEpChange(watchedEp + 1)} className="text-gray-500 hover:text-white px-1 text-sm font-black">+</button>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-2 mb-4 animate-pulse">
              <div className="h-3 bg-[#1c1c26] rounded w-full" />
              <div className="h-3 bg-[#1c1c26] rounded w-5/6" />
              <div className="h-3 bg-[#1c1c26] rounded w-4/6" />
            </div>
          )}
          {!loading && details?.overview && (
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-2">Story</p>
              <p className="text-sm text-gray-400 leading-relaxed">{details.overview}</p>
            </div>
          )}

          {!loading && cast.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-3">Top Cast</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {cast.map(person => (
                  <div key={person.id} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px]">
                    {person.profile_path
                      ? <img src={TMDB_IMG(person.profile_path, 'w185')} alt={person.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
                      : <div className="w-14 h-14 rounded-full bg-[#1c1c26] border-2 border-white/10 flex items-center justify-center">
                          <User size={20} className="text-gray-600" />
                        </div>
                    }
                    <p className="text-[9px] font-bold text-white text-center leading-tight line-clamp-2">{person.name}</p>
                    {person.character && <p className="text-[8px] text-gray-600 text-center leading-tight line-clamp-1">{person.character}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
