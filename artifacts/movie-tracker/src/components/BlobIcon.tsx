// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';

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

// Each mood: base=darkest fill, deep=shadow, mid=body, bright=lit fold, peak=brightest fold, edge=rim darkening
const MOODS: Record<string, { base: string; deep: string; mid: string; bright: string; peak: string; edge: string }> = {
  default:     { base:'#100028', deep:'#200048', mid:'#5500AA', bright:'#AA00CC', peak:'#D400EE', edge:'#04000E' },
  horror:      { base:'#120000', deep:'#300000', mid:'#800000', bright:'#CC0000', peak:'#FF2200', edge:'#050000' },
  romance:     { base:'#150010', deep:'#350028', mid:'#880055', bright:'#DD0088', peak:'#FF44AA', edge:'#060004' },
  scifi:       { base:'#001018', deep:'#002030', mid:'#006699', bright:'#00AADD', peak:'#00EEFF', edge:'#000507' },
  action:      { base:'#140600', deep:'#301000', mid:'#882200', bright:'#CC4400', peak:'#FF8800', edge:'#060200' },
  comedy:      { base:'#140E00', deep:'#302200', mid:'#886600', bright:'#CCAA00', peak:'#FFD700', edge:'#060500' },
  drama:       { base:'#000018', deep:'#000C30', mid:'#103388', bright:'#2255CC', peak:'#4488FF', edge:'#000006' },
  fantasy:     { base:'#0C0018', deep:'#200038', mid:'#660099', bright:'#9933CC', peak:'#CC99FF', edge:'#050008' },
  thriller:    { base:'#050A10', deep:'#101820', mid:'#233344', bright:'#446688', peak:'#6699BB', edge:'#020408' },
  animation:   { base:'#150010', deep:'#330028', mid:'#880055', bright:'#DD0099', peak:'#FF55CC', edge:'#060004' },
  documentary: { base:'#021008', deep:'#082818', mid:'#156633', bright:'#22AA55', peak:'#55CC88', edge:'#010504' },
  mystery:     { base:'#050B12', deep:'#101C28', mid:'#224455', bright:'#336677', peak:'#88AACC', edge:'#020508' },
  western:     { base:'#0E0800', deep:'#221500', mid:'#775500', bright:'#AA8800', peak:'#DDAA00', edge:'#050300' },
  war:         { base:'#080A0C', deep:'#141820', mid:'#303844', bright:'#4A5A66', peak:'#778899', edge:'#030405' },
  music:       { base:'#0A0018', deep:'#180030', mid:'#440088', bright:'#7722CC', peak:'#AA55FF', edge:'#040008' },
  adventure:   { base:'#021008', deep:'#083020', mid:'#1A6644', bright:'#22AA77', peak:'#55CCAA', edge:'#010503' },
  crime:       { base:'#0E0400', deep:'#200C00', mid:'#662200', bright:'#994400', peak:'#CC6600', edge:'#050100' },
  history:     { base:'#0C0700', deep:'#201400', mid:'#664422', bright:'#996633', peak:'#CCAA77', edge:'#050300' },
};

let _styleInjected = false;
function ensureStyles() {
  if (_styleInjected || typeof document === 'undefined') return;
  _styleInjected = true;
  const el = document.createElement('style');
  el.textContent = `
@keyframes blobFloat {
  0%,100% { transform:translateY(0px) rotate(0deg); }
  40%  { transform:translateY(-5px) rotate(0.8deg); }
  70%  { transform:translateY(3px) rotate(-0.6deg); }
}
@keyframes blobFloatFast {
  0%,100% { transform:translateY(0px) rotate(0deg) scale(1); }
  25% { transform:translateY(-7px) rotate(2deg) scale(1.03); }
  50% { transform:translateY(4px) rotate(-1.5deg) scale(0.97); }
  75% { transform:translateY(-4px) rotate(1deg) scale(1.02); }
}
@keyframes blobGlow {
  0%,100% { opacity:0.3; transform:scale(1); }
  50% { opacity:0.55; transform:scale(1.1); }
}
@keyframes blobGlowFast {
  0%,100% { opacity:0.45; transform:scale(1); }
  50% { opacity:0.85; transform:scale(1.25); }
}
@keyframes blobError {
  0%   { transform:scale(1);    opacity:1;   filter:saturate(1) blur(0px);  }
  10%  { transform:scale(1.4);  opacity:0.9; filter:saturate(3) blur(0px);  }
  28%  { transform:scale(2.3);  opacity:0.8; filter:saturate(5) blur(4px);  }
  48%  { transform:scale(3.5);  opacity:0.4; filter:saturate(6) blur(16px); }
  65%  { transform:scale(0.2);  opacity:0.1; filter:saturate(0) blur(9px);  }
  82%  { transform:scale(1.1);  opacity:0.7; filter:saturate(1) blur(0px);  }
  100% { transform:scale(1);    opacity:1;   filter:saturate(1) blur(0px);  }
}
@keyframes blobVanish {
  0%   { transform:scale(1);    opacity:1;    }
  20%  { transform:scale(1.3);  opacity:0.95; }
  55%  { transform:scale(1.1);  opacity:0.5;  }
  80%  { transform:scale(0.4);  opacity:0.15; }
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
    : animate    ? `${isGenerating ? 'blobFloatFast 2.2s' : 'blobFloat 5.5s'} ease-in-out infinite`
    : 'none';

  const glowAnim = animate
    ? `${isGenerating ? 'blobGlowFast 1.2s' : 'blobGlow 3.5s'} ease-in-out infinite`
    : 'none';

  // ── KEY: numOctaves=2 + very low baseFrequency = large SMOOTH silk folds, NOT rocky ──
  const turbDur     = isGenerating ? '5s'  : '14s';
  const scaleDur    = isGenerating ? '5s'  : '14s';

  // Low baseFrequency (0.006-0.014) → large gentle undulations → smooth silky surface
  const bfValues = isGenerating
    ? '0.012 0.014;0.018 0.010;0.014 0.019;0.009 0.016;0.016 0.011;0.012 0.014'
    : '0.007 0.009;0.012 0.006;0.009 0.013;0.005 0.010;0.011 0.007;0.007 0.009';

  // Displacement scale: moderate enough to create folds, small enough to stay smooth
  const scaleValues = isGenerating ? '26;34;22;30;24;26' : '18;24;15;21;17;18';
  const ks5 = '0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1';

  const glowSize = size * 1.4;
  const glowBlur = size * 0.5;

  const fxId = `${id}-fx`;
  const ids = Array.from({ length: 12 }, (_, i) => `${id}-g${i}`);

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
      {/* Soft ambient glow — no harsh ring, just a subtle haze */}
      <span
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${p.bright}66 0%, ${p.mid}22 55%, transparent 80%)`,
          filter: `blur(${glowBlur}px)`,
          animation: glowAnim,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 0.9s ease',
        }}
      />

      {/* Remount SVG when generating state toggles — restarts SMIL animations */}
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
            `drop-shadow(0 0 ${size * 0.07}px ${p.bright}99)`,
            `drop-shadow(0 ${size * 0.025}px ${size * 0.05}px ${p.edge}cc)`,
          ].join(' '),
        }}
      >
        <defs>
          {/* ── SMOOTH SILK FILTER ──
              numOctaves=2  → only large-scale waves, NO fine bumps/rocks
              baseFrequency very low → large gentle undulations
              scale moderate → visible but smooth fold displacement         */}
          <filter id={fxId} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.007 0.009"
              numOctaves={2}
              seed={11}
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
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={18} xChannelSelector="R" yChannelSelector="G">
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

          {/* ── GRADIENT LAYERS ── (all circles same r=44, gradients give fold lighting) */}

          {/* G0 — Dark base fill */}
          <radialGradient id={ids[0]} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={p.deep} />
            <stop offset="100%" stopColor={p.edge} />
          </radialGradient>

          {/* G1 — Main color wash: lit from upper-center */}
          <radialGradient id={ids[1]} cx="54%" cy="40%" r="68%">
            <stop offset="0%"   stopColor={p.peak}   stopOpacity="1" />
            <stop offset="38%"  stopColor={p.bright} stopOpacity="0.85" />
            <stop offset="70%"  stopColor={p.mid}    stopOpacity="0.6" />
            <stop offset="100%" stopColor={p.deep}   stopOpacity="0" />
          </radialGradient>

          {/* G2 — Top-right fold peak (brightest lit area) */}
          <radialGradient id={ids[2]} cx="68%" cy="25%" r="44%">
            <stop offset="0%"   stopColor={p.peak}   stopOpacity="0.9" />
            <stop offset="42%"  stopColor={p.bright} stopOpacity="0.45" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* G3 — Center-left fold (secondary illuminated fold) */}
          <radialGradient id={ids[3]} cx="28%" cy="46%" r="38%">
            <stop offset="0%"   stopColor={p.bright} stopOpacity="0.8" />
            <stop offset="52%"  stopColor={p.mid}    stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* G4 — Bottom-right fold (tertiary lit area) */}
          <radialGradient id={ids[4]} cx="70%" cy="68%" r="36%">
            <stop offset="0%"   stopColor={p.peak}   stopOpacity="0.7" />
            <stop offset="55%"  stopColor={p.bright} stopOpacity="0.25" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* G5 — Top-left fold accent (smaller lit area) */}
          <radialGradient id={ids[5]} cx="22%" cy="26%" r="30%">
            <stop offset="0%"   stopColor={p.bright} stopOpacity="0.65" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* G6 — Bottom-left deep shadow valley */}
          <radialGradient id={ids[6]} cx="20%" cy="74%" r="42%">
            <stop offset="0%"   stopColor={p.edge}  stopOpacity="0.9" />
            <stop offset="60%"  stopColor={p.deep}  stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* G7 — Center crease shadow (fold valley in middle) */}
          <radialGradient id={ids[7]} cx="48%" cy="56%" r="30%">
            <stop offset="0%"   stopColor={p.edge}  stopOpacity="0.75" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* G8 — Right-center shadow fold */}
          <radialGradient id={ids[8]} cx="78%" cy="50%" r="28%">
            <stop offset="0%"   stopColor={p.deep}  stopOpacity="0.65" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* G9 — Edge vignette: darken the rim for depth */}
          <radialGradient id={ids[9]} cx="50%" cy="50%" r="50%">
            <stop offset="52%"  stopColor="transparent" />
            <stop offset="100%" stopColor={p.edge}  stopOpacity="0.95" />
          </radialGradient>

          {/* G10 — Main specular hot-spot: white shine on top-right */}
          <radialGradient id={ids[10]} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.88)" />
            <stop offset="40%"  stopColor="rgba(240,210,255,0.35)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* G11 — Secondary specular: softer shine center-right */}
          <radialGradient id={ids[11]} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
            <stop offset="55%"  stopColor="rgba(220,170,255,0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* ════ LAYER STACK ════
            Every shape is a circle at (50,50) r=44 displaced by the SAME smooth filter.
            They all deform into the SAME blob outline.
            Each gradient layer adds one component of the fold lighting.
            Result: smooth crumpled silk surface with coherent lighting.         */}

        {/* L0 — Dark base */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[0]})`} filter={`url(#${fxId})`} />

        {/* L1 — Main color sweep */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[1]})`} filter={`url(#${fxId})`} />

        {/* L2 — Top-right fold (brightest) */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[2]})`} filter={`url(#${fxId})`} />

        {/* L3 — Center-left fold */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[3]})`} filter={`url(#${fxId})`} />

        {/* L4 — Bottom-right fold */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[4]})`} filter={`url(#${fxId})`} />

        {/* L5 — Top-left fold accent */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[5]})`} filter={`url(#${fxId})`} />

        {/* L6 — Bottom-left shadow valley */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[6]})`} filter={`url(#${fxId})`} />

        {/* L7 — Center crease shadow */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[7]})`} filter={`url(#${fxId})`} />

        {/* L8 — Right-center shadow fold */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[8]})`} filter={`url(#${fxId})`} />

        {/* L9 — Edge vignette (rim darkening for roundness) */}
        <circle cx="50" cy="50" r="44" fill={`url(#${ids[9]})`} filter={`url(#${fxId})`} />

        {/* L10 — Main specular shine (top-right hot spot) */}
        <ellipse cx="65" cy="24" rx="12" ry="8" fill={`url(#${ids[10]})`} filter={`url(#${fxId})`} />

        {/* L11 — Secondary specular (right-center) */}
        <ellipse cx="74" cy="42" rx="9"  ry="7" fill={`url(#${ids[11]})`} filter={`url(#${fxId})`} />
      </svg>
    </span>
  );
}
