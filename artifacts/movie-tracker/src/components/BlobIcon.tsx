// @ts-nocheck
import React, { useState, useRef, useMemo, useEffect } from 'react';

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

const MOODS: Record<string, { bright: string; mid: string; dark: string; deepest: string; glow: string }> = {
  default:     { bright: '#D400FF', mid: '#8B00FF', dark: '#4B0082', deepest: '#0e0020', glow: '#7700cc' },
  horror:      { bright: '#FF2200', mid: '#CC0000', dark: '#660000', deepest: '#170000', glow: '#aa0000' },
  romance:     { bright: '#FF66BB', mid: '#FF1493', dark: '#880044', deepest: '#1a000b', glow: '#DD0066' },
  scifi:       { bright: '#00FFFF', mid: '#009EDD', dark: '#003366', deepest: '#000d18', glow: '#007BBB' },
  action:      { bright: '#FF9900', mid: '#FF4400', dark: '#660f00', deepest: '#180500', glow: '#DD3300' },
  comedy:      { bright: '#FFE000', mid: '#FFAA00', dark: '#664000', deepest: '#180e00', glow: '#DDAA00' },
  drama:       { bright: '#5599FF', mid: '#1155CC', dark: '#001166', deepest: '#000018', glow: '#2266AA' },
  fantasy:     { bright: '#DD99FF', mid: '#9944DD', dark: '#331166', deepest: '#0c0018', glow: '#7733CC' },
  thriller:    { bright: '#6699BB', mid: '#334466', dark: '#111a22', deepest: '#05090d', glow: '#223344' },
  animation:   { bright: '#FF99DD', mid: '#FF44AA', dark: '#660e33', deepest: '#18000b', glow: '#DD2277' },
  documentary: { bright: '#77CC99', mid: '#228844', dark: '#093320', deepest: '#020c08', glow: '#117733' },
  mystery:     { bright: '#99BBDD', mid: '#445577', dark: '#112233', deepest: '#04080c', glow: '#334466' },
  western:     { bright: '#DDAA00', mid: '#886600', dark: '#332200', deepest: '#0c0800', glow: '#775500' },
  war:         { bright: '#889999', mid: '#445566', dark: '#1a2233', deepest: '#04090d', glow: '#334455' },
  music:       { bright: '#BB55FF', mid: '#6622CC', dark: '#210066', deepest: '#070018', glow: '#5511BB' },
  adventure:   { bright: '#55CCAA', mid: '#228877', dark: '#0a3328', deepest: '#020c08', glow: '#117766' },
  crime:       { bright: '#DD6600', mid: '#883300', dark: '#331100', deepest: '#0c0400', glow: '#662200' },
  history:     { bright: '#DDAA77', mid: '#886633', dark: '#332200', deepest: '#0c0700', glow: '#664422' },
};

let _styleInjected = false;
function ensureStyles() {
  if (_styleInjected || typeof document === 'undefined') return;
  _styleInjected = true;
  const el = document.createElement('style');
  el.textContent = `
@keyframes blobFloat {
  0%,100% { transform:translateY(0px) rotate(0deg); }
  33%      { transform:translateY(-6px) rotate(1.5deg); }
  66%      { transform:translateY(3px) rotate(-1deg); }
}
@keyframes blobFloatFast {
  0%,100% { transform:translateY(0px) rotate(0deg) scale(1); }
  25% { transform:translateY(-8px) rotate(3deg) scale(1.04); }
  50% { transform:translateY(4px) rotate(-2deg) scale(0.96); }
  75% { transform:translateY(-5px) rotate(1.5deg) scale(1.02); }
}
@keyframes blobGlow {
  0%,100% { opacity:0.4; transform:scale(1); }
  50% { opacity:0.75; transform:scale(1.15); }
}
@keyframes blobGlowFast {
  0%,100% { opacity:0.55; transform:scale(1); }
  50% { opacity:1; transform:scale(1.4); }
}
@keyframes blobError {
  0%   { transform:scale(1);   opacity:1;   filter:saturate(1) blur(0px);  }
  10%  { transform:scale(1.35);opacity:0.95;filter:saturate(2.5) blur(0px);}
  25%  { transform:scale(2.1); opacity:0.85;filter:saturate(5) blur(2px);  }
  45%  { transform:scale(3.2); opacity:0.45;filter:saturate(6) blur(14px); }
  65%  { transform:scale(0.2); opacity:0.08;filter:saturate(0) blur(8px);  }
  80%  { transform:scale(1.08);opacity:0.7; filter:saturate(1) blur(0px);  }
  100% { transform:scale(1);   opacity:1;   filter:saturate(1) blur(0px);  }
}
@keyframes blobVanish {
  0%   { transform:scale(1);    opacity:1;    }
  20%  { transform:scale(1.28); opacity:0.97; }
  50%  { transform:scale(1.12); opacity:0.55; }
  75%  { transform:scale(0.45); opacity:0.18; }
  100% { transform:scale(0);    opacity:0;    }
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
  const [id] = useState(() => `b${Math.random().toString(36).slice(2, 8)}`);
  const p = MOODS[mood] ?? MOODS.default;

  useMemo(() => ensureStyles(), []);

  useEffect(() => {
    if (state !== 'complete' || !onVanished) return;
    const t = setTimeout(onVanished, 720);
    return () => clearTimeout(t);
  }, [state, onVanished]);

  const isGenerating = pulse || state === 'generating';
  const isError      = state === 'error';
  const isComplete   = state === 'complete';

  const wrapperAnim =
    isError    ? 'blobError 1.3s cubic-bezier(0.4,0,0.2,1) forwards'
    : isComplete ? 'blobVanish 0.72s ease-in forwards'
    : animate    ? `${isGenerating ? 'blobFloatFast 2s' : 'blobFloat 5s'} ease-in-out infinite`
    : 'none';

  const glowAnim = animate
    ? `${isGenerating ? 'blobGlowFast 1s' : 'blobGlow 2.8s'} ease-in-out infinite`
    : 'none';

  const turbDur     = isGenerating ? '2.8s' : '10s';
  const scaleDur    = isGenerating ? '2.8s' : '10s';
  const bfValues    = isGenerating
    ? '0.033 0.040;0.046 0.029;0.037 0.050;0.027 0.043;0.041 0.033;0.033 0.040'
    : '0.026 0.030;0.034 0.022;0.028 0.038;0.020 0.032;0.032 0.024;0.026 0.030';
  const scaleValues = isGenerating ? '42;54;36;48;40;42' : '30;38;24;34;28;30';
  const ks5         = '0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1';

  const glowSize = size * 1.55;
  const glowBlur = size * 0.55;

  const fxId   = `${id}-f`;
  const blurId = `${id}-blur`;
  const g0     = `${id}-g0`;
  const g1     = `${id}-g1`;
  const g2     = `${id}-g2`;
  const g3     = `${id}-g3`;
  const g4     = `${id}-g4`;
  const g5     = `${id}-g5`;

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
        willChange: 'transform, opacity, filter',
      }}
    >
      {/* Outer ambient glow */}
      <span
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${p.glow}cc 0%, ${p.dark}44 55%, transparent 80%)`,
          filter: `blur(${glowBlur}px)`,
          animation: glowAnim,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 0.9s ease',
        }}
      />

      {/* SVG blob — re-mounts when generating state toggles to restart SMIL */}
      <svg
        key={`${id}-${isGenerating ? 'g' : 's'}`}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{
          position: 'relative',
          zIndex: 1,
          overflow: 'visible',
          display: 'block',
          transition: 'filter 0.9s ease',
          filter: [
            `drop-shadow(0 0 ${size * 0.12}px ${p.mid})`,
            `drop-shadow(0 0 ${size * 0.06}px ${p.bright})`,
            `drop-shadow(0 ${size * 0.04}px ${size * 0.08}px ${p.deepest}aa)`,
          ].join(' '),
        }}
      >
        <defs>
          {/* ── Crumpled-silk displacement filter ── */}
          <filter
            id={fxId}
            x="-40%" y="-40%"
            width="180%" height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="turbulence"
              baseFrequency="0.026 0.030"
              numOctaves={7}
              seed={4}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values={bfValues}
                dur={turbDur}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines={ks5}
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={30}
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                attributeName="scale"
                values={scaleValues}
                dur={scaleDur}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines={ks5}
              />
            </feDisplacementMap>
          </filter>

          {/* ── Gradients ── */}

          {/* Base: main 3-stop depth gradient */}
          <radialGradient id={g0} cx="60%" cy="35%" r="70%">
            <stop offset="0%"   stopColor={p.bright} />
            <stop offset="32%"  stopColor={p.mid} />
            <stop offset="68%"  stopColor={p.dark} />
            <stop offset="100%" stopColor={p.deepest} />
          </radialGradient>

          {/* Highlight 1: primary light on top-right silk fold */}
          <radialGradient id={g1} cx="68%" cy="26%" r="48%">
            <stop offset="0%"   stopColor="rgba(255,210,255,0.70)" />
            <stop offset="38%"  stopColor="rgba(200,80,255,0.28)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Highlight 2: secondary bounce light bottom-left */}
          <radialGradient id={g2} cx="20%" cy="74%" r="36%">
            <stop offset="0%"   stopColor="rgba(180,60,220,0.42)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Shadow fold: main dark crease center-bottom */}
          <radialGradient id={g3} cx="44%" cy="63%" r="48%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0.62)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Left-side deep crease */}
          <radialGradient id={g4} cx="18%" cy="46%" r="36%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0.50)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Specular: tiny hot-spot shine */}
          <radialGradient id={g5} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.90)" />
            <stop offset="55%"  stopColor="rgba(255,255,255,0.30)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* ── Layer stack — all circles share the SAME displacement filter
             so every gradient warps identically, creating silky fold illusion ── */}

        {/* L1 – Base blob */}
        <circle cx="50" cy="50" r="44" fill={`url(#${g0})`} filter={`url(#${fxId})`} />

        {/* L2 – Top-right main highlight fold */}
        <ellipse cx="62" cy="34" rx="36" ry="27"
          fill={`url(#${g1})`} filter={`url(#${fxId})`} />

        {/* L3 – Bottom-left ambient bounce */}
        <ellipse cx="26" cy="70" rx="30" ry="24"
          fill={`url(#${g2})`} filter={`url(#${fxId})`} />

        {/* L4 – Center-bottom shadow crease */}
        <ellipse cx="44" cy="62" rx="32" ry="26"
          fill={`url(#${g3})`} filter={`url(#${fxId})`} />

        {/* L5 – Left-side deep fold */}
        <ellipse cx="20" cy="46" rx="24" ry="30"
          fill={`url(#${g4})`} filter={`url(#${fxId})`} />

        {/* L6 – Specular micro-highlight */}
        <ellipse cx="65" cy="26" rx="10" ry="7"
          fill={`url(#${g5})`} filter={`url(#${fxId})`} />
      </svg>
    </span>
  );
}
