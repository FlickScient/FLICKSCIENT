// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
// The reference 3D-rendered silk blob image — exactly what the user wants
import blobSrc from '@assets/file_0000000015d47208b8783183028c4c07_1780952971978.png';

export type BlobMood =
  | 'default' | 'horror' | 'romance' | 'scifi' | 'action' | 'comedy'
  | 'drama' | 'fantasy' | 'thriller' | 'animation' | 'documentary'
  | 'mystery' | 'western' | 'war' | 'music' | 'adventure' | 'crime' | 'history';

export type BlobState = 'idle' | 'generating' | 'error' | 'complete';

interface BlobIconProps {
  size?: number;
  animate?: boolean;
  pulse?: boolean;
  mood?: BlobMood;
  state?: BlobState;
  onVanished?: () => void;
}

// CSS hue-rotate offset for each mood (source image is purple ~280°)
// formula: target_hue – 280 = rotation
const MOOD_FILTER: Record<string, string> = {
  default:     'hue-rotate(0deg)   saturate(1.05)',
  horror:      'hue-rotate(80deg)  saturate(1.3)  brightness(0.85)',
  romance:     'hue-rotate(50deg)  saturate(1.25)',
  scifi:       'hue-rotate(-100deg) saturate(1.3)  brightness(1.1)',
  action:      'hue-rotate(110deg) saturate(1.4)  brightness(0.9)',
  comedy:      'hue-rotate(140deg) saturate(1.3)',
  drama:       'hue-rotate(-60deg) saturate(1.1)  brightness(0.9)',
  fantasy:     'hue-rotate(20deg)  saturate(1.2)',
  thriller:    'hue-rotate(-80deg) saturate(0.65) brightness(0.75)',
  animation:   'hue-rotate(60deg)  saturate(1.4)',
  documentary: 'hue-rotate(-120deg) saturate(0.9)',
  mystery:     'hue-rotate(-90deg) saturate(0.8)',
  western:     'hue-rotate(115deg) saturate(1.2)  brightness(0.88)',
  war:         'hue-rotate(-150deg) saturate(0.25) brightness(0.7)',
  music:       'hue-rotate(30deg)  saturate(1.3)',
  adventure:   'hue-rotate(-125deg) saturate(1.1)',
  crime:       'hue-rotate(100deg) saturate(1.2)  brightness(0.85)',
  history:     'hue-rotate(110deg) saturate(0.75) brightness(0.85)',
};

const MOOD_GLOW: Record<string, string> = {
  default: '#8800CC', horror: '#CC0000', romance: '#FF1493', scifi: '#00CCFF',
  action: '#FF6600', comedy: '#FFD700', drama: '#3355FF', fantasy: '#AA44FF',
  thriller: '#445577', animation: '#FF44AA', documentary: '#33AA55',
  mystery: '#4477AA', western: '#AA8800', war: '#556677', music: '#7733FF',
  adventure: '#22AA77', crime: '#993300', history: '#AA8855',
};

// ── 12-point organic blob polygons (computed from irregular radii at 30° intervals) ──
// All shapes have the same 12 vertices so CSS can smoothly interpolate between them.
const P: string[] = [
  '50% 8%,  73% 10%, 88% 28%, 98% 50%, 86% 71%, 73% 89%, 50% 93%, 27% 91%, 15% 71%,  4% 50%, 12% 28%, 28% 11%',
  '50% 4%,  71% 14%, 91% 27%, 93% 50%, 92% 74%, 71% 86%, 50% 96%, 29% 86%,  8% 74%,  7% 50%, 10% 27%, 29% 14%',
  '50% 6%,  74%  8%, 86% 30%, 97% 50%, 88% 72%, 74% 92%, 50% 91%, 27% 90%, 12% 72%,  3% 50%, 14% 29%, 27%  9%',
  '50% 3%,  72% 13%, 92% 26%, 92% 50%, 89% 73%, 72% 88%, 50% 98%, 29% 87%, 10% 73%,  6% 50%,  8% 26%, 29% 13%',
  '50% 7%,  74%  9%, 87% 29%, 98% 50%, 86% 71%, 73% 90%, 50% 94%, 26% 92%, 14% 71%,  4% 50%, 11% 28%, 27% 10%',
  '50% 5%,  72% 12%, 90% 27%, 94% 50%, 91% 74%, 71% 86%, 50% 97%, 28% 88%, 13% 72%,  3% 50%, 13% 29%, 27%  9%',
  '50% 2%,  71% 15%, 89% 28%, 96% 50%, 87% 72%, 74% 91%, 50% 92%, 28% 89%,  9% 74%,  8% 50%,  9% 27%, 28% 12%',
  '50% 9%,  73% 10%, 92% 26%, 93% 50%, 90% 73%, 72% 87%, 50% 98%, 30% 86%, 11% 73%,  5% 50%, 12% 28%, 27% 10%',
  '50% 5%,  75% 11%, 89% 32%, 95% 50%, 84% 70%, 70% 91%, 50% 95%, 30% 93%, 16% 72%,  6% 50%, 13% 26%, 26%  8%',
  '50% 7%,  70%  9%, 90% 25%, 97% 50%, 88% 74%, 74% 93%, 52% 96%, 28% 90%, 10% 70%,  4% 50%, 11% 30%, 30% 12%',
];

let _styleInjected = false;
function ensureStyles() {
  if (_styleInjected || typeof document === 'undefined') return;
  _styleInjected = true;
  const el = document.createElement('style');
  el.textContent = `
@keyframes blobFloat {
  0%,100% { transform:translateY(0px) rotate(0deg); }
  40% { transform:translateY(-5px) rotate(0.7deg); }
  70% { transform:translateY(3px) rotate(-0.5deg); }
}
@keyframes blobFloatFast {
  0%,100% { transform:translateY(0px) rotate(0deg) scale(1); }
  25% { transform:translateY(-7px) rotate(2deg) scale(1.04); }
  50% { transform:translateY(4px) rotate(-1.5deg) scale(0.96); }
  75% { transform:translateY(-4px) rotate(1deg) scale(1.02); }
}
@keyframes blobGlow {
  0%,100% { opacity:0.28; transform:scale(1); }
  50% { opacity:0.52; transform:scale(1.1); }
}
@keyframes blobGlowFast {
  0%,100% { opacity:0.4; transform:scale(1); }
  50% { opacity:0.85; transform:scale(1.28); }
}
@keyframes blobMorph {
  0%   { clip-path:polygon(${P[0]}) }
  11%  { clip-path:polygon(${P[1]}) }
  22%  { clip-path:polygon(${P[2]}) }
  33%  { clip-path:polygon(${P[3]}) }
  44%  { clip-path:polygon(${P[4]}) }
  55%  { clip-path:polygon(${P[5]}) }
  66%  { clip-path:polygon(${P[6]}) }
  77%  { clip-path:polygon(${P[7]}) }
  88%  { clip-path:polygon(${P[8]}) }
  100% { clip-path:polygon(${P[0]}) }
}
@keyframes blobMorphFast {
  0%   { clip-path:polygon(${P[0]}) }
  10%  { clip-path:polygon(${P[2]}) }
  20%  { clip-path:polygon(${P[5]}) }
  30%  { clip-path:polygon(${P[7]}) }
  40%  { clip-path:polygon(${P[1]}) }
  50%  { clip-path:polygon(${P[4]}) }
  60%  { clip-path:polygon(${P[9]}) }
  70%  { clip-path:polygon(${P[3]}) }
  80%  { clip-path:polygon(${P[6]}) }
  90%  { clip-path:polygon(${P[8]}) }
  100% { clip-path:polygon(${P[0]}) }
}
@keyframes blobError {
  0%   { transform:scale(1);    opacity:1;   filter:saturate(1) blur(0px);  }
  12%  { transform:scale(1.4);  opacity:0.9; filter:saturate(3) blur(0px);  }
  28%  { transform:scale(2.3);  opacity:0.8; filter:saturate(5) blur(4px);  }
  48%  { transform:scale(3.5);  opacity:0.4; filter:saturate(6) blur(16px); }
  65%  { transform:scale(0.2);  opacity:0.1; filter:saturate(0) blur(9px);  }
  82%  { transform:scale(1.1);  opacity:0.7; filter:saturate(1) blur(0px);  }
  100% { transform:scale(1);    opacity:1;   filter:saturate(1) blur(0px);  }
}
@keyframes blobVanish {
  0%   { transform:scale(1);   opacity:1;    }
  25%  { transform:scale(1.3); opacity:0.95; }
  55%  { transform:scale(1.1); opacity:0.5;  }
  80%  { transform:scale(0.4); opacity:0.15; }
  100% { transform:scale(0);   opacity:0;    }
}
`;
  document.head.appendChild(el);
}

export default function BlobIcon({
  size = 40,
  animate = true,
  pulse = false,
  mood = 'default',
  state = 'idle',
  onVanished,
}: BlobIconProps) {
  useMemo(() => ensureStyles(), []);

  useEffect(() => {
    if (state !== 'complete' || !onVanished) return;
    const t = setTimeout(onVanished, 720);
    return () => clearTimeout(t);
  }, [state, onVanished]);

  const isGenerating = pulse || state === 'generating';
  const isError      = state === 'error';
  const isComplete   = state === 'complete';

  // Outer wrapper handles: float + state (error/vanish) animations
  const wrapperAnim =
    isError    ? 'blobError 1.3s cubic-bezier(0.4,0,0.2,1) forwards'
    : isComplete ? 'blobVanish 0.72s ease-in forwards'
    : animate    ? `${isGenerating ? 'blobFloatFast 2.2s' : 'blobFloat 5.5s'} ease-in-out infinite`
    : 'none';

  // Glow animation
  const glowAnim = animate
    ? `${isGenerating ? 'blobGlowFast 1.2s' : 'blobGlow 3.5s'} ease-in-out infinite`
    : 'none';

  // Clip-path morph animation (separate from float so both can play together)
  const morphAnim = animate
    ? `${isGenerating ? 'blobMorphFast 3s' : 'blobMorph 10s'} ease-in-out infinite`
    : 'none';

  // Mood: hue-rotate shifts the purple image to target color
  const moodFilter  = MOOD_FILTER[mood] ?? MOOD_FILTER.default;
  const glowColor   = MOOD_GLOW[mood]   ?? MOOD_GLOW.default;
  const brightBoost = isGenerating ? ' brightness(1.18)' : '';

  const glowSize = size * 1.4;
  const glowBlur = size * 0.5;

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
        animation: wrapperAnim,
        willChange: 'transform, opacity',
      }}
    >
      {/* Soft ambient glow behind the blob */}
      <span
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor}50 0%, ${glowColor}14 55%, transparent 78%)`,
          filter: `blur(${glowBlur}px)`,
          animation: glowAnim,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 0.9s ease',
        }}
      />

      {/* ── Blob layer: the actual 3D silk image + clip-path morph ──
          The image IS the reference silk blob.
          clip-path cuts it into an organic shape that continuously morphs.
          filter: hue-rotate shifts purple → mood color.
          overflow:hidden confines the image within the clip boundary.       */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'block',
          width: size,
          height: size,
          overflow: 'hidden',
          clipPath: `polygon(${P[0]})`,
          animation: morphAnim,
          filter: `${moodFilter}${brightBoost}`,
          transition: 'filter 0.9s ease',
          flexShrink: 0,
        }}
      >
        {/* Scale image up 135% so the blob fills the frame (image has background margins) */}
        <img
          src={blobSrc}
          alt=""
          draggable={false}
          style={{
            width: '135%',
            height: '135%',
            objectFit: 'cover',
            display: 'block',
            marginLeft: '-17.5%',
            marginTop: '-17.5%',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      </span>
    </span>
  );
}
