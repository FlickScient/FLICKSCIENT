// @ts-nocheck
import { Film, Star, Bookmark } from 'lucide-react';
import { TMDB_GENRES, LANG_TO_INDUSTRY, INDUSTRIES, genreColor, TMDB_IMG } from '../lib/constants';

export default function ResultCard({ item, mediaType, addedWatched, addedWatchlist, onAdd, onWatchlist, onPreview }) {
  const title    = item.title || item.name;
  const year     = (item.release_date || item.first_air_date || '').split('-')[0];
  const genre    = item.genre_ids?.[0] ? TMDB_GENRES[item.genre_ids[0]] : null;
  const type     = mediaType || (item.media_type === 'tv' ? 'Series' : 'Movie');
  const rating   = item.vote_average > 0 ? item.vote_average.toFixed(1) : null;
  const industry = LANG_TO_INDUSTRY[item.original_language];
  const indInfo  = industry ? INDUSTRIES.find(i => i.label === industry) : null;

  return (
    <div className="flex bg-[#111116] rounded-2xl border border-white/[0.05] overflow-hidden cursor-pointer hover:border-white/10 transition-colors"
      onClick={() => onPreview && onPreview(title)}>
      <div className="w-16 flex-shrink-0">
        {item.poster_path
          ? <img src={TMDB_IMG(item.poster_path, 'w200')} className="w-full h-full object-cover" style={{ minHeight: 96 }} alt="" />
          : <div className="w-full bg-[#1c1c26] flex items-center justify-center" style={{ minHeight: 96 }}><Film size={18} className="text-gray-700" /></div>
        }
      </div>
      <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm leading-snug text-white">{title}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {year    && <span className="text-xs text-yellow-600 font-bold">{year}</span>}
            <span className="text-[9px] text-gray-600 uppercase tracking-wide">{type}</span>
            {indInfo && <span className="text-[9px]">{indInfo.flag}</span>}
            {genre   && <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${genreColor(genre)}`}>{genre}</span>}
          </div>
          {rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={9} fill="currentColor" className="text-yellow-500" />
              <span className="text-[9px] text-yellow-600 font-bold">{rating}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0 justify-center pr-3" onClick={e => e.stopPropagation()}>
        <button onClick={() => !addedWatched && !addedWatchlist && onWatchlist(item, type)}
          title="Save to Watchlist"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            addedWatchlist ? 'bg-blue-900/40 text-blue-400' :
            addedWatched  ? 'bg-[#1c1c26] text-gray-700 cursor-not-allowed' :
            'bg-[#1c1c26] text-gray-500 border border-white/10 hover:text-blue-400 hover:border-blue-500/30'
          }`}>
          <Bookmark size={14} fill={addedWatchlist ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => !addedWatched && !addedWatchlist && onAdd(item, type)}
          className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
            addedWatched  ? 'bg-green-900/40 text-green-400' :
            addedWatchlist? 'bg-[#1c1c26] text-gray-700 cursor-not-allowed' :
            'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95'
          }`}>
          {addedWatched ? '✓' : '+'}
        </button>
      </div>
    </div>
  );
}
