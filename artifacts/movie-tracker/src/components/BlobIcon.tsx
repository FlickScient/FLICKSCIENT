// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

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
  streamRate?: number;
  onVanished?: () => void;
}

// ─────────────────────────────────────────────────────────────────
// PALETTE — exact colours from the reference orb image analysis:
//
//   deep   = dark navy-violet  (shadow pockets / crevices)
//   mid    = deep body colour  (base surface)
//   bright = vivid lit colour  (the main surface under light)
//   high   = near-white silver (specular ridge lines + rim)
//   glow   = CSS outer glow colour
//   css    = CSS fallback gradient
//
// Default palette pixel-measured from the reference screenshot:
//   deep   ≈ rgb(18,  8, 41)   = vec3(0.07, 0.03, 0.16)
//   mid    ≈ rgb(87, 20,117)   = vec3(0.34, 0.08, 0.46)
//   bright ≈ rgb(168,41,189)   = vec3(0.66, 0.16, 0.74)
//   high   ≈ rgb(250,242,255)  = vec3(0.98, 0.95, 1.00)
// ─────────────────────────────────────────────────────────────────
type Pal = {
  deep: [number,number,number];
  mid:  [number,number,number];
  bright:[number,number,number];
  high: [number,number,number];
  glow: string;
  css:  string;
};

const PAL: Record<string, Pal> = {
  // Default: exact reference image magenta-purple
  default:    { deep:[0.07,0.03,0.16], mid:[0.34,0.08,0.46], bright:[0.66,0.16,0.74], high:[0.98,0.95,1.00], glow:'rgba(168,41,189,0.55)', css:'radial-gradient(circle,#A829BD,#120829)' },
  // Horror: blood crimson
  horror:     { deep:[0.12,0.01,0.02], mid:[0.40,0.04,0.06], bright:[0.75,0.08,0.12], high:[1.00,0.92,0.90], glow:'rgba(190,20,30,0.55)',  css:'radial-gradient(circle,#C01018,#1e0204)' },
  // Romance: rose/deep pink
  romance:    { deep:[0.12,0.02,0.08], mid:[0.40,0.06,0.22], bright:[0.75,0.14,0.44], high:[1.00,0.94,0.97], glow:'rgba(190,35,112,0.55)', css:'radial-gradient(circle,#C02470,#1e0314)' },
  // Sci-fi: electric cyan-teal
  scifi:      { deep:[0.01,0.08,0.16], mid:[0.03,0.22,0.44], bright:[0.06,0.48,0.80], high:[0.92,0.99,1.00], glow:'rgba(15,122,204,0.55)', css:'radial-gradient(circle,#0F7ACD,#021428)' },
  // Action: intense orange
  action:     { deep:[0.14,0.05,0.01], mid:[0.42,0.16,0.02], bright:[0.80,0.36,0.04], high:[1.00,0.96,0.88], glow:'rgba(204,92,10,0.55)',  css:'radial-gradient(circle,#CC5C0A,#23080a)' },
  // Comedy: bright sunny yellow
  comedy:     { deep:[0.12,0.10,0.01], mid:[0.38,0.32,0.02], bright:[0.75,0.68,0.04], high:[1.00,0.99,0.88], glow:'rgba(190,172,10,0.55)', css:'radial-gradient(circle,#BEAC0A,#1e1a02)' },
  // Drama: deep royal blue
  drama:      { deep:[0.02,0.04,0.16], mid:[0.06,0.12,0.46], bright:[0.12,0.28,0.80], high:[0.92,0.96,1.00], glow:'rgba(30,72,204,0.55)',  css:'radial-gradient(circle,#1E48CC,#030a28)' },
  // Fantasy: vivid violet
  fantasy:    { deep:[0.08,0.02,0.18], mid:[0.26,0.04,0.52], bright:[0.52,0.10,0.90], high:[0.96,0.90,1.00], glow:'rgba(133,25,230,0.55)', css:'radial-gradient(circle,#8519E6,#14032e)' },
  // Thriller: cold steel grey-blue
  thriller:   { deep:[0.04,0.05,0.08], mid:[0.14,0.18,0.28], bright:[0.28,0.36,0.56], high:[0.94,0.96,0.99], glow:'rgba(72,92,143,0.55)',  css:'radial-gradient(circle,#485C8F,#0a0c14)' },
  // Animation: hot pink
  animation:  { deep:[0.12,0.02,0.10], mid:[0.38,0.05,0.28], bright:[0.78,0.12,0.58], high:[1.00,0.93,0.98], glow:'rgba(199,30,148,0.55)', css:'radial-gradient(circle,#C71E94,#1e031a)' },
  // Documentary: forest green
  documentary:{ deep:[0.02,0.10,0.04], mid:[0.04,0.30,0.12], bright:[0.08,0.60,0.24], high:[0.90,1.00,0.94], glow:'rgba(20,153,61,0.55)',  css:'radial-gradient(circle,#14993D,#020e06)' },
  // Mystery: deep teal-indigo
  mystery:    { deep:[0.02,0.06,0.12], mid:[0.06,0.18,0.36], bright:[0.12,0.36,0.68], high:[0.90,0.96,1.00], glow:'rgba(30,92,173,0.55)',  css:'radial-gradient(circle,#1E5CAD,#03091e)' },
  // Western: golden amber
  western:    { deep:[0.14,0.08,0.01], mid:[0.42,0.26,0.02], bright:[0.76,0.54,0.06], high:[1.00,0.98,0.88], glow:'rgba(194,138,15,0.55)', css:'radial-gradient(circle,#C28A0F,#231202)' },
  // War: dark olive
  war:        { deep:[0.06,0.07,0.04], mid:[0.20,0.24,0.12], bright:[0.38,0.44,0.22], high:[0.94,0.96,0.90], glow:'rgba(97,112,56,0.55)',  css:'radial-gradient(circle,#617038,#0e1208)' },
  // Music: electric purple
  music:      { deep:[0.08,0.02,0.16], mid:[0.24,0.05,0.46], bright:[0.48,0.10,0.84], high:[0.96,0.90,1.00], glow:'rgba(122,25,214,0.55)', css:'radial-gradient(circle,#7A19D6,#14032a)' },
  // Adventure: jade green-teal
  adventure:  { deep:[0.02,0.10,0.08], mid:[0.04,0.30,0.28], bright:[0.08,0.60,0.52], high:[0.90,1.00,0.98], glow:'rgba(20,153,133,0.55)', css:'radial-gradient(circle,#149985,#020e0c)' },
  // Crime: burnt sienna
  crime:      { deep:[0.14,0.06,0.02], mid:[0.40,0.18,0.04], bright:[0.76,0.36,0.08], high:[1.00,0.96,0.90], glow:'rgba(194,92,20,0.55)',  css:'radial-gradient(circle,#C25C14,#23090a)' },
  // History: burnished gold
  history:    { deep:[0.12,0.09,0.02], mid:[0.36,0.28,0.04], bright:[0.70,0.58,0.10], high:[1.00,0.99,0.90], glow:'rgba(179,148,25,0.55)', css:'radial-gradient(circle,#B39419,#1e1504)' },
};

// ─────────────────────────────────────────────────────────────────
// NOISE GLSL — Ashima Simplex 3D noise (exact from meta-orb source)
// ─────────────────────────────────────────────────────────────────
const noiseGLSL = /* glsl */`
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0*C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0*C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4  j  = p - 49.0 * floor(p * ns.z * ns.z);
  vec4  x_ = floor(j * ns.z);
  vec4  y_ = floor(j - 7.0 * x_);
  vec4  x  = x_ *ns.x + ns.yyyy;
  vec4  y  = y_ *ns.x + ns.yyyy;
  vec4  h  = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float fbm(vec3 p){
  float f = 0.0;
  f += 1.00 * snoise(p * 0.9);
  f += 0.40 * snoise(p * 1.8 + 13.7);
  f += 0.14 * snoise(p * 3.2 + 41.2);
  return f;
}
`;

// ─────────────────────────────────────────────────────────────────
// VERTEX SHADER — exact port from meta-orb.tsx
// ─────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
precision highp float;
uniform float uTime;
uniform float uDisplace;

varying vec3  vNormalW;
varying vec3  vViewDir;
varying float vFold;
varying vec3  vPos;

${noiseGLSL}

vec3 displaced(vec3 dir){
  float t = uTime * 0.16;
  float n = fbm(dir * 1.3 + vec3(0.0, 0.0, t));
  n += 0.35 * fbm(dir * 2.2 - vec3(t, t * 0.5, 0.0));
  return dir * (1.0 + n * uDisplace);
}

void main(){
  vec3 dir = normalize(position);
  vec3 dp  = displaced(dir);
  vFold    = length(dp) - 1.0;

  vec3 tangent   = normalize(cross(dir, vec3(0.0, 1.0, 0.0) + 0.001));
  vec3 bitangent = normalize(cross(dir, tangent));
  float eps = 0.04;
  vec3 a = displaced(normalize(dir + tangent   * eps));
  vec3 b = displaced(normalize(dir + bitangent * eps));
  vec3 newNormal = normalize(cross(a - dp, b - dp));
  if (dot(newNormal, dir) < 0.0) newNormal = -newNormal;

  vec4 worldPos = modelMatrix * vec4(dp, 1.0);
  vPos          = dp;
  vNormalW      = normalize(mat3(modelMatrix) * newNormal);
  vViewDir      = normalize(cameraPosition - worldPos.xyz);
  gl_Position   = projectionMatrix * viewMatrix * worldPos;
}
`;

// ─────────────────────────────────────────────────────────────────
// FRAGMENT SHADER — exact port with mood-uniform colours
//
//  Uses the reflection vector against a vertical gradient env map —
//  this is the secret to the liquid-glass chrome appearance.
//  Colours driven by uniforms so mood changes work.
// ─────────────────────────────────────────────────────────────────
const FRAG = /* glsl */`
precision highp float;
uniform float uTime;
uniform vec3  uDeep;    /* dark shadow / crevice colour  */
uniform vec3  uMid;     /* body colour                   */
uniform vec3  uBright;  /* lit surface colour            */
uniform vec3  uHigh;    /* specular / rim highlight      */

varying vec3  vNormalW;
varying vec3  vViewDir;
varying float vFold;
varying vec3  vPos;

void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);
  vec3 R = reflect(-V, N);

  /* Vertical environment gradient — dark at bottom, bright at top */
  float h = R.y * 0.5 + 0.5;   /* 0 = bottom, 1 = top */
  vec3 env = uDeep;
  env = mix(env, uMid,    smoothstep(0.18, 0.50, h));
  env = mix(env, uBright, smoothstep(0.52, 0.80, h));
  env = mix(env, uHigh,   smoothstep(0.92, 1.00, h));
  /* Saturated belly lower down */
  env = mix(env, uBright, smoothstep(0.42, 0.28, h) * 0.45);

  /* Horizontal chrome streak */
  float sweep = smoothstep(0.80, 0.98, R.x * 0.5 + 0.5);
  env = mix(env, uHigh, sweep * 0.4);

  /* Crevices → deep dark */
  float crease = smoothstep(0.02, -0.32, vFold);
  env = mix(env, uDeep * 0.35, crease);

  /* Specular */
  vec3 L1 = normalize(vec3(0.3, 0.9, 0.45));
  vec3 H1 = normalize(L1 + V);
  float spec = pow(max(dot(N, H1), 0.0), 80.0);

  /* Fresnel rim */
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);

  vec3 col = env;
  col = mix(col, uHigh, clamp(spec, 0.0, 1.0));
  col += uHigh * pow(fres, 4.0) * 0.7;
  col = mix(col, uDeep * 0.7, fres * 0.35);

  /* Filmic tone curve — deep darks, controlled highlights */
  col = col / (col + vec3(0.3));
  col = pow(col, vec3(0.92));

  gl_FragColor = vec4(col, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────
// CSS keyframes
// ─────────────────────────────────────────────────────────────────
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected || typeof document === 'undefined') return;
  _cssInjected = true;
  const el = document.createElement('style');
  el.textContent = `
@keyframes blobErr {
  0%   {transform:scale(1);   opacity:1;   filter:blur(0)}
  20%  {transform:scale(1.6); opacity:.85; filter:blur(1px)}
  42%  {transform:scale(3.0); opacity:.5;  filter:saturate(5) blur(7px)}
  60%  {transform:scale(.10); opacity:.05; filter:blur(12px)}
  80%  {transform:scale(1.06);opacity:.75; filter:blur(0)}
  100% {transform:scale(1);   opacity:1;   filter:blur(0)}
}
@keyframes blobVanish {
  0%   {transform:scale(1);   opacity:1}
  28%  {transform:scale(1.24);opacity:.95}
  100% {transform:scale(0);   opacity:0}
}
@keyframes blobPulse {
  0%,100% {opacity:.82}
  50%     {opacity:1}
}`;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export default function BlobIcon({
  size       = 40,
  animate    = true,
  pulse      = false,
  mood       = 'default',
  state      = 'idle',
  streamRate = 0,
  onVanished,
}: BlobIconProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ pulse, mood, animate, streamRate, state });
  const [webglOk, setWebglOk] = useState(true);
  propsRef.current = { pulse, mood, animate, streamRate, state };

  injectCSS();

  useEffect(() => {
    if (state !== 'complete' || !onVanished) return;
    const id = setTimeout(onVanished, 720);
    return () => clearTimeout(id);
  }, [state, onVanished]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── Renderer ──────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglOk(false);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    if (!renderer.getContext()) { renderer.dispose(); setWebglOk(false); return; }
    container.appendChild(renderer.domElement);

    // ── Scene / Camera ─────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 0, 4.2);

    // ── IcosahedronGeometry — detail=18 is plenty at 24–80px sizes ─
    // detail=50 → ~25k vertices; detail=18 → ~3.2k — 8× less GPU work
    const geo = new THREE.IcosahedronGeometry(1.5, 18);

    const pal0 = PAL.default;
    const uniforms = {
      uTime:     { value: 0.0 },
      uDisplace: { value: 0.22 },   // exact value from meta-orb source
      uDeep:     { value: new THREE.Vector3(...pal0.deep) },
      uMid:      { value: new THREE.Vector3(...pal0.mid) },
      uBright:   { value: new THREE.Vector3(...pal0.bright) },
      uHigh:     { value: new THREE.Vector3(...pal0.high) },
    };

    const mat  = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const blob = new THREE.Mesh(geo, mat);
    scene.add(blob);

    // ── Render loop — capped at 30fps, paused when off-screen ──────
    let startTs: number | null = null;
    let lastRender = 0;
    let rafId  = 0;
    let alive  = true;
    let visible = true;
    const TARGET_MS = 1000 / 30; // 30fps cap — halves GPU load vs 60fps

    // Pause rendering when the orb scrolls off-screen
    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(container);

    const frame = (ts: number) => {
      if (!alive) return;
      rafId = requestAnimationFrame(frame);
      if (!visible) return;                      // paused — off-screen
      if (ts - lastRender < TARGET_MS) return;  // throttle to 30fps
      lastRender = ts;

      if (startTs === null) startTs = ts;
      const sec = (ts - startTs) * 0.001;

      const { pulse: p, mood: m, streamRate: sr } = propsRef.current;
      const pal = PAL[m] || PAL.default;

      const displace = 0.22 + (p ? 0.05 : 0) + sr * 0.04;
      uniforms.uTime.value     = sec;
      uniforms.uDisplace.value = displace;
      uniforms.uDeep.value.set(...pal.deep);
      uniforms.uMid.value.set(...pal.mid);
      uniforms.uBright.value.set(...pal.bright);
      uniforms.uHigh.value.set(...pal.high);

      blob.rotation.y = sec * 0.12;
      blob.rotation.x = Math.sin(sec * 0.15) * 0.12;

      try { renderer.render(scene, camera); }
      catch { alive = false; setWebglOk(false); }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [size]);

  // ── CSS glow ───────────────────────────────────────────────────
  const pal     = PAL[mood] || PAL.default;
  const r1      = Math.round(size * (pulse ? 0.38 : 0.22));
  const r2      = Math.round(size * (pulse ? 0.65 : 0.40));
  const glowCSS = `drop-shadow(0 0 ${r1}px ${pal.glow}) drop-shadow(0 0 ${r2}px ${pal.glow})`;

  const wrapAnim =
    state === 'error'      ? 'blobErr 1.40s cubic-bezier(.4,0,.2,1) forwards'
    : state === 'complete' ? 'blobVanish .72s ease-in forwards'
    : pulse                ? 'blobPulse 1.8s ease-in-out infinite'
    : 'none';

  if (!webglOk) {
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        width:size, height:size, flexShrink:0,
        borderRadius:'50%', background:pal.css, filter:glowCSS, animation:wrapAnim,
      }} />
    );
  }

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      position:'relative', width:size, height:size, flexShrink:0,
      animation:wrapAnim, filter:glowCSS, willChange:'transform,opacity,filter',
    }}>
      <div ref={mountRef} style={{ lineHeight: 0 }} />
    </span>
  );
}
