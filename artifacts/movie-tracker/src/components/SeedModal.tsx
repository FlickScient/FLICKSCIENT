// @ts-nocheck
import { useState } from 'react';
import { Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TMDB_GENRES, detectIndustry, TMDB_IMG, tmdb } from '../lib/constants';

export default function SeedModal({ onClose, onDone, userId }) {
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
        const data = await tmdb(`/discover/movie?sort_by=vote_count.desc&vote_count.gte=500&include_adult=false&page=${page}`);
        for (const m of (data.results || [])) {
          items.push({ user_id: userId, title: m.title || m.original_title || 'Untitled',
            year: m.release_date?.split('-')[0] || '', type: 'Movie',
            poster: m.poster_path ? TMDB_IMG(m.poster_path, 'w200') : null,
            genre: TMDB_GENRES[m.genre_ids?.[0]] || null,
            industry: detectIndustry(m.original_language),
            tmdb_id: m.id,
            status: 'unwatched', watched: false, favorite: false });
        }
      } catch (_) {}
    }
    for (let page = 1; page <= 5; page++) {
      setStatus(`Fetching series… page ${page}/5`);
      setProgress(Math.round(((20 + page) / 27) * 80));
      try {
        const data = await tmdb(`/discover/tv?sort_by=vote_count.desc&vote_count.gte=500&include_adult=false&page=${page}`);
        for (const m of (data.results || [])) {
          items.push({ user_id: userId, title: m.name || m.original_name || 'Untitled',
            year: m.first_air_date?.split('-')[0] || '', type: 'Series',
            poster: m.poster_path ? TMDB_IMG(m.poster_path, 'w200') : null,
            genre: TMDB_GENRES[m.genre_ids?.[0]] || null,
            industry: detectIndustry(m.original_language),
            tmdb_id: m.id,
            status: 'unwatched', watched: false, favorite: false,
            episodes_watched: 0, total_episodes: 0 });
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
