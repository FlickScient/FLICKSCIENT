// @ts-nocheck
import React, { useMemo } from 'react';

export type BlobMood =
  | 'default' | 'horror' | 'romance' | 'scifi' | 'action' | 'comedy'
  | 'drama' | 'fantasy' | 'thriller' | 'animation' | 'documentary'
  | 'mystery' | 'western' | 'war' | 'music' | 'adventure' | 'crime' | 'history';

interface BlobIconProps {
  size?: number;
  animate?: boolean;
  pulse?: boolean;
  mood?: BlobMood;
}

const MOOD_PALETTES: Record<string, { c1: string; c2: string; mid: string; glow: string }> = {
  default:     { c1: '#4B0082', c2: '#8B00FF', mid: '#6600cc', glow: 'rgba(139,0,255,0.5)'   },
  horror:      { c1: '#5c0000', c2: '#c0392b', mid: '#8b0000', glow: 'rgba(192,57,43,0.6)'   },
  romance:     { c1: '#880e4f', c2: '#f06292', mid: '#c2185b', glow: 'rgba(240,98,146,0.5)'  },
  scifi:       { c1: '#004d5c', c2: '#00e5ff', mid: '#0097a7', glow: 'rgba(0,229,255,0.5)'   },
  action:      { c1: '#7f1700', c2: '#ff6d00', mid: '#bf360c', glow: 'rgba(255,109,0,0.55)'  },
  comedy:      { c1: '#7f4800', c2: '#ffd600', mid: '#f9a825', glow: 'rgba(255,214,0,0.5)'   },
  drama:       { c1: '#0d1458', c2: '#3f51b5', mid: '#283593', glow: 'rgba(63,81,181,0.5)'   },
  fantasy:     { c1: '#3a007a', c2: '#ab47bc', mid: '#6a1b9a', glow: 'rgba(171,71,188,0.5)'  },
  thriller:    { c1: '#101820', c2: '#4a6fa5', mid: '#263238', glow: 'rgba(74,111,165,0.5)'  },
  animation:   { c1: '#4a0060', c2: '#f48fb1', mid: '#880e4f', glow: 'rgba(244,143,177,0.5)' },
  documentary: { c1: '#0a3300', c2: '#66bb6a', mid: '#1b5e20', glow: 'rgba(102,187,106,0.5)' },
  mystery:     { c1: '#101820', c2: '#4fc3f7', mid: '#01579b', glow: 'rgba(79,195,247,0.5)'  },
  western:     { c1: '#4a2800', c2: '#d4a017', mid: '#7f5000', glow: 'rgba(212,160,23,0.5)'  },
  war:         { c1: '#1a1a1a', c2: '#607d8b', mid: '#37474f', glow: 'rgba(96,125,139,0.5)'  },
  music:       { c1: '#1a0050', c2: '#7c4dff', mid: '#4527a0', glow: 'rgba(124,77,255,0.5)'  },
  adventure:   { c1: '#003300', c2: '#69f0ae', mid: '#00695c', glow: 'rgba(105,240,174,0.5)' },
  crime:       { c1: '#1a0a00', c2: '#ff6e40', mid: '#6d1f00', glow: 'rgba(255,110,64,0.5)'  },
  history:     { c1: '#2c1a00', c2: '#c8a96e', mid: '#6d4c12', glow: 'rgba(200,169,110,0.5)' },
};

let _styleInjected = false;

function ensureStyles() {
  if (_styleInjected) return;
  _styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
@keyframes blob-morph {
  0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  12%  { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  25%  { border-radius: 50% 60% 30% 40% / 50% 70% 60% 40%; }
  37%  { border-radius: 40% 70% 60% 50% / 40% 50% 70% 60%; }
  50%  { border-radius: 70% 30% 50% 60% / 30% 60% 40% 70%; }
  62%  { border-radius: 40% 60% 70% 30% / 60% 40% 50% 60%; }
  75%  { border-radius: 60% 50% 40% 70% / 70% 30% 60% 40%; }
  87%  { border-radius: 30% 70% 50% 60% / 40% 60% 50% 70%; }
  100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
}
@keyframes blob-morph-fast {
  0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  12%  { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  25%  { border-radius: 50% 60% 30% 40% / 50% 70% 60% 40%; }
  37%  { border-radius: 40% 70% 60% 50% / 40% 50% 70% 60%; }
  50%  { border-radius: 70% 30% 50% 60% / 30% 60% 40% 70%; }
  62%  { border-radius: 40% 60% 70% 30% / 60% 40% 50% 60%; }
  75%  { border-radius: 60% 50% 40% 70% / 70% 30% 60% 40%; }
  87%  { border-radius: 30% 70% 50% 60% / 40% 60% 50% 70%; }
  100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
}
@keyframes blob-float {
  0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
  33%       { transform: translateY(-4px) rotate(2deg) scale(1.02); }
  66%       { transform: translateY(2px) rotate(-1.5deg) scale(0.98); }
}
@keyframes blob-float-fast {
  0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
  25%       { transform: translateY(-5px) rotate(3deg) scale(1.04); }
  50%       { transform: translateY(2px) rotate(-2deg) scale(0.97); }
  75%       { transform: translateY(-3px) rotate(1deg) scale(1.03); }
}
@keyframes blob-glow-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.15); }
}
@keyframes blob-glow-pulse-fast {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.25); }
}
`;
  document.head.appendChild(style);
}

export default function BlobIcon({ size = 40, animate = true, pulse = false, mood = 'default' }: BlobIconProps) {
  const palette = MOOD_PALETTES[mood] ?? MOOD_PALETTES.default;

  const morphAnim   = pulse ? 'blob-morph-fast'      : 'blob-morph';
  const floatAnim   = pulse ? 'blob-float-fast'      : 'blob-float';
  const glowAnim    = pulse ? 'blob-glow-pulse-fast' : 'blob-glow-pulse';
  const morphDur    = pulse ? '2.5s'  : '7s';
  const floatDur    = pulse ? '1.8s'  : '4s';
  const glowDur     = pulse ? '1.2s'  : '2.5s';
  const glowSize    = pulse ? size * 1.35 : size * 1.2;
  const glowBlur    = pulse ? size * 0.6  : size * 0.45;

  useMemo(() => { ensureStyles(); }, []);

  const gradId = `blob-grad-${mood}`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Glow halo */}
      <span
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          borderRadius: '50%',
          background: palette.glow,
          filter: `blur(${glowBlur}px)`,
          animation: animate ? `${glowAnim} ${glowDur} ease-in-out infinite` : 'none',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Blob body */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{
          position: 'relative',
          zIndex: 1,
          willChange: 'transform, border-radius',
          animation: animate
            ? `${morphAnim} ${morphDur} ease-in-out infinite, ${floatAnim} ${floatDur} ease-in-out infinite`
            : 'none',
          display: 'block',
          overflow: 'visible',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          transition: 'filter 0.8s ease',
          filter: `drop-shadow(0 0 ${size * 0.12}px ${palette.c2})`,
        }}
      >
        <defs>
          <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
            <stop offset="0%"   stopColor={palette.c2} stopOpacity="1" />
            <stop offset="45%"  stopColor={palette.mid} stopOpacity="1" />
            <stop offset="100%" stopColor={palette.c1}  stopOpacity="1" />
          </radialGradient>
          <radialGradient id={`${gradId}-shine`} cx="28%" cy="22%" r="40%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)"    />
          </radialGradient>
        </defs>
        {/* Main blob shape */}
        <ellipse cx="50" cy="50" rx="46" ry="46" fill={`url(#${gradId})`} />
        {/* Specular shine */}
        <ellipse cx="35" cy="32" rx="18" ry="14" fill={`url(#${gradId}-shine)`} opacity="0.9" />
        {/* Deep shadow fold */}
        <ellipse cx="62" cy="65" rx="22" ry="16" fill={palette.c1} opacity="0.35" />
        {/* Secondary crinkle */}
        <ellipse cx="40" cy="58" rx="14" ry="10" fill={palette.c1} opacity="0.25" />
        {/* Highlight fleck */}
        <ellipse cx="72" cy="36" rx="7" ry="5" fill="rgba(255,255,255,0.18)" />
      </svg>
    </span>
  );
}
