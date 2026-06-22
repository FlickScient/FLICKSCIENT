// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipForward } from 'lucide-react';

// ─── Color extraction from a poster image ────────────────────────────────────
function extractPosterPalette(src: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 40; canvas.height = 60;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 40, 60);
        const data = ctx.getImageData(0, 0, 40, 60).data;

        // Sample 3 zones: top-left, center, bottom-right
        const zones = [
          { x: 0, y: 0, w: 20, h: 30 },
          { x: 10, y: 15, w: 20, h: 30 },
          { x: 20, y: 30, w: 20, h: 30 },
        ];

        const colors = zones.map(({ x, y, w, h }) => {
          let r = 0, g = 0, b = 0, n = 0;
          for (let py = y; py < y + h; py++) {
            for (let px = x; px < x + w; px++) {
              const i = (py * 40 + px) * 4;
              const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
              // skip too dark or too washed out
              if (brightness > 20 && brightness < 235) {
                r += data[i]; g += data[i+1]; b += data[i+2]; n++;
              }
            }
          }
          if (n === 0) return null;
          return `${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)}`;
        }).filter(Boolean);

        resolve(colors.length > 0 ? colors : ['80,60,20']);
      } catch (_) {
        resolve(['80,60,20']);
      }
    };
    img.onerror = () => resolve(['80,60,20']);
    img.src = src;
  });
}

// ─── Ambient background layer (fixed, behind everything) ─────────────────────
export function AmbientBackground({ movie }: { movie: any }) {
  const [palette, setPalette] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const prevId = useRef(null);

  useEffect(() => {
    if (!movie) { setVisible(false); return; }
    if (movie.id === prevId.current) return;
    prevId.current = movie.id;

    setVisible(false);
    const src = movie.poster;
    if (!src) { setPalette(['80,60,20']); setVisible(true); return; }

    extractPosterPalette(src).then((colors) => {
      setPalette(colors);
      setTimeout(() => setVisible(true), 50);
    });
  }, [movie?.id]);

  if (!movie || palette.length === 0) return null;

  const c0 = palette[0] || '80,60,20';
  const c1 = palette[1] || c0;
  const c2 = palette[2] || c0;

  return (
    <>
      <style>{`
        @keyframes ambientShimmer {
          0%   { opacity: 0.13; transform: scale(1)    rotate(0deg); }
          33%  { opacity: 0.18; transform: scale(1.04) rotate(1deg); }
          66%  { opacity: 0.14; transform: scale(0.97) rotate(-1deg); }
          100% { opacity: 0.13; transform: scale(1)    rotate(0deg); }
        }
        @keyframes ambientPulse {
          0%,100% { opacity: 0.07; }
          50%     { opacity: 0.14; }
        }
      `}</style>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          transition: 'opacity 1.2s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Primary shimmer orb */}
        <div style={{
          position: 'absolute',
          top: '-20%', left: '-10%',
          width: '70%', height: '70%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(${c0},0.35) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          animation: 'ambientShimmer 6s ease-in-out infinite',
          animationDelay: '0s',
        }} />
        {/* Secondary orb */}
        <div style={{
          position: 'absolute',
          bottom: '10%', right: '-5%',
          width: '55%', height: '55%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(${c1},0.25) 0%, transparent 70%)`,
          filter: 'blur(80px)',
          animation: 'ambientShimmer 8s ease-in-out infinite',
          animationDelay: '-3s',
        }} />
        {/* Tertiary accent */}
        <div style={{
          position: 'absolute',
          top: '40%', left: '30%',
          width: '40%', height: '40%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(${c2},0.18) 0%, transparent 70%)`,
          filter: 'blur(50px)',
          animation: 'ambientPulse 5s ease-in-out infinite',
          animationDelay: '-1.5s',
        }} />
        {/* Vignette to keep edges dark */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(10,10,15,0.75) 100%)',
        }} />
      </div>
    </>
  );
}

// ─── Now Watching banner ──────────────────────────────────────────────────────
interface NowWatchingBannerProps {
  movie: any;
  onClear: () => void;
  onEpisodeUpdate?: (id: string, ep: number, total: number) => void;
}

export default function NowWatchingBanner({ movie, onClear, onEpisodeUpdate }: NowWatchingBannerProps) {
  const [palette, setPalette] = useState<string[]>([]);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!movie?.poster) { setPalette(['80,60,20']); return; }
    extractPosterPalette(movie.poster).then(setPalette);
  }, [movie?.id]);

  if (!movie) return null;

  const c0 = palette[0] || '80,60,20';
  const c1 = palette[1] || c0;

  const isSeries    = movie.type === 'Series';
  const watchedEp   = movie.episodes_watched || 0;
  const totalEp     = movie.total_episodes   || 1;
  const epPct       = isSeries && totalEp > 0 ? Math.round((watchedEp / totalEp) * 100) : 0;

  const nextEp = () => {
    if (!isSeries || !onEpisodeUpdate) return;
    const next = Math.min(watchedEp + 1, totalEp);
    onEpisodeUpdate(movie.id, next, totalEp);
  };

  return (
    <>
      <style>{`
        @keyframes bannerGlow {
          0%,100% { box-shadow: 0 0 24px rgba(${c0},0.35), 0 2px 16px rgba(0,0,0,0.6); }
          50%     { box-shadow: 0 0 36px rgba(${c0},0.50), 0 2px 16px rgba(0,0,0,0.6); }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
      <div
        className="relative overflow-hidden rounded-2xl mx-4 mb-3"
        style={{
          background: `linear-gradient(135deg, rgba(${c0},0.22) 0%, rgba(${c1},0.14) 100%)`,
          border: `1px solid rgba(${c0},0.4)`,
          animation: 'bannerGlow 3s ease-in-out infinite',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Shimmer sweep */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            width: '30%',
            background: `linear-gradient(90deg, transparent, rgba(${c0},0.15), transparent)`,
            animation: 'shimmerSweep 3s ease-in-out infinite',
            animationDelay: '1s',
          }} />
        </div>

        <div className="flex items-center gap-3 p-3 relative z-10">
          {/* Poster thumbnail */}
          {movie.poster ? (
            <img src={movie.poster} alt={movie.title}
              className="w-12 h-16 object-cover rounded-xl flex-shrink-0"
              style={{ boxShadow: `0 0 12px rgba(${c0},0.5)` }} />
          ) : (
            <div className="w-12 h-16 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ background: `rgba(${c0},0.2)` }}>
              <Play size={18} className="text-white/60" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background: `rgb(${c0})`, boxShadow: `0 0 4px rgba(${c0},0.8)`, animation: 'ambientPulse 2s ease-in-out infinite' }} />
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Now Watching</p>
            </div>
            <p className="text-sm font-black text-white leading-tight truncate">{movie.title}</p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {movie.year}{isSeries ? ` · Ep ${watchedEp}/${totalEp}` : ''}
            </p>

            {isSeries && totalEp > 0 && (
              <div className="mt-1.5 w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${epPct}%`, background: `rgb(${c0})`, boxShadow: `0 0 4px rgba(${c0},0.6)` }} />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isSeries && (
              <button onClick={nextEp}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: `rgba(${c0},0.2)`, border: `1px solid rgba(${c0},0.4)` }}
                title="Next episode">
                <SkipForward size={14} className="text-white" />
              </button>
            )}
            <button onClick={() => setPlaying(p => !p)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: `rgba(${c0},0.2)`, border: `1px solid rgba(${c0},0.4)` }}>
              {playing ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white" />}
            </button>
            <button onClick={onClear}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 hover:bg-white/10">
              <X size={14} className="text-white/50" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
