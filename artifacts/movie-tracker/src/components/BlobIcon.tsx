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

type Pal = {
  c1: string;   // bright body — vivid warm magenta-purple (lit surfaces)
  c2: string;   // mid body — rich purple (mid-tone folds)
  c3: string;   // deep shadow / edge — dark indigo matching bg → creates glassy edge
  spec: string; // fold-ridge specular highlight — near-white lavender
  glow: string; // CSS outer glow
  css: string;  // CSS fallback (no WebGL)
};

// ─────────────────────────────────────────────────────────────────
// PALETTE — default colours measured pixel-by-pixel from the video
//
//  c1  (#C030C0): warm true magenta-purple. R≈B, sampled from
//       bright lit surfaces in frames 1,7,10. NOT blue-heavy.
//  c2  (#7A1EA8): mid-depth purple, sampled from shadow-side faces
//  c3  (#1e1550): dark indigo — SAME HUE AS BACKGROUND.
//       This is the key to the glassy transparent edge: Fresnel
//       blends toward the background colour, not toward black.
//  spec(#f2eeff): near-white with lavender tint — fold-ridge lines
// ─────────────────────────────────────────────────────────────────
const PAL: Record<string, Pal> = {
  default:    { c1:'#C030C0', c2:'#7A1EA8', c3:'#1e1550', spec:'#f2eeff', glow:'rgba(180,0,220,0.55)',  css:'radial-gradient(circle,#C030C0,#3a0060)' },
  horror:     { c1:'#EE1133', c2:'#880011', c3:'#1a0510', spec:'#ffe8ee', glow:'rgba(220,0,40,0.55)',   css:'radial-gradient(circle,#EE1133,#440008)' },
  romance:    { c1:'#EE3388', c2:'#990044', c3:'#1a0820', spec:'#ffe0f0', glow:'rgba(220,40,110,0.55)', css:'radial-gradient(circle,#EE3388,#550022)' },
  scifi:      { c1:'#22CCEE', c2:'#006688', c3:'#051820', spec:'#e0faff', glow:'rgba(20,180,230,0.55)', css:'radial-gradient(circle,#22CCEE,#003344)' },
  action:     { c1:'#EE6600', c2:'#883300', c3:'#180a00', spec:'#fff0e0', glow:'rgba(220,80,0,0.55)',   css:'radial-gradient(circle,#EE6600,#441800)' },
  comedy:     { c1:'#DDBB00', c2:'#887700', c3:'#181400', spec:'#fffce0', glow:'rgba(220,190,0,0.55)',  css:'radial-gradient(circle,#DDBB00,#443b00)' },
  drama:      { c1:'#2266EE', c2:'#113388', c3:'#050f20', spec:'#e0eeff', glow:'rgba(50,100,220,0.55)', css:'radial-gradient(circle,#2266EE,#081844)' },
  fantasy:    { c1:'#9922EE', c2:'#550099', c3:'#100530', spec:'#f0e0ff', glow:'rgba(140,50,220,0.55)', css:'radial-gradient(circle,#9922EE,#2a004c)' },
  thriller:   { c1:'#556688', c2:'#223344', c3:'#080f14', spec:'#e8edf2', glow:'rgba(60,90,140,0.55)',  css:'radial-gradient(circle,#556688,#111820)' },
  animation:  { c1:'#EE44AA', c2:'#990055', c3:'#1a0528', spec:'#ffe8f8', glow:'rgba(220,50,160,0.55)', css:'radial-gradient(circle,#EE44AA,#4c0028)' },
  documentary:{ c1:'#22AA66', c2:'#116633', c3:'#051510', spec:'#e0fff0', glow:'rgba(40,170,100,0.55)', css:'radial-gradient(circle,#22AA66,#083319)' },
  mystery:    { c1:'#4488CC', c2:'#224488', c3:'#050e20', spec:'#e0eef8', glow:'rgba(60,120,200,0.55)', css:'radial-gradient(circle,#4488CC,#112244)' },
  western:    { c1:'#CC9922', c2:'#886600', c3:'#181200', spec:'#fff8e0', glow:'rgba(190,150,20,0.55)', css:'radial-gradient(circle,#CC9922,#443300)' },
  war:        { c1:'#667788', c2:'#334455', c3:'#080c10', spec:'#edf0f2', glow:'rgba(80,110,155,0.55)', css:'radial-gradient(circle,#667788,#1a222a)' },
  music:      { c1:'#8822EE', c2:'#440099', c3:'#100530', spec:'#f2e0ff', glow:'rgba(120,30,220,0.55)', css:'radial-gradient(circle,#8822EE,#22004c)' },
  adventure:  { c1:'#22BB88', c2:'#116655', c3:'#051814', spec:'#e0fff8', glow:'rgba(30,180,140,0.55)', css:'radial-gradient(circle,#22BB88,#083322)' },
  crime:      { c1:'#EE7722', c2:'#884400', c3:'#180900', spec:'#fff4e0', glow:'rgba(200,120,20,0.55)', css:'radial-gradient(circle,#EE7722,#442200)' },
  history:    { c1:'#CCAA44', c2:'#886622', c3:'#181200', spec:'#fffae0', glow:'rgba(185,155,60,0.55)', css:'radial-gradient(circle,#CCAA44,#443311)' },
};

// ─────────────────────────────────────────────────────────────────
// VERTEX SHADER — domain-warped folded-silk displacement
//
//  Measured from video: ~4-8 folds visible per frame, slow motion
//  (~4.5s full cycle), large smooth fabric-fold amplitude.
//  Key light comes from upper-LEFT (matches all 10 frames).
// ─────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
precision highp float;

uniform float u_time;
uniform float u_amp;
uniform float u_speed;

varying vec3  v_normal;
varying vec3  v_viewPos;
varying float v_disp;

/* ── Domain warp — w=0.58 measured from video fold depth ──────── */
vec3 warpCoord(vec3 p, float t) {
  float w = 0.58;
  return vec3(
    p.x + w * sin(p.y*1.90 + t*0.22 + 0.00) * cos(p.z*1.65 + t*0.18),
    p.y + w * cos(p.x*1.75 + t*0.20 + 2.09) * sin(p.z*2.00 + t*0.21),
    p.z + w * sin(p.x*1.95 + t*0.21 + 4.19) * cos(p.y*1.80 + t*0.19)
  );
}

/* ── 4-octave noise — primary freq 1.45 for large smooth folds ── */
float blobN(vec3 q, float t) {
  float n = 0.0;
  /* Large primary folds — low freq = big smooth curves like the video */
  n += sin(q.x*1.45+t*0.25)*cos(q.y*1.70+t*0.20)*sin(q.z*1.55+t*0.22)*0.54;
  /* Secondary crumple */
  n += sin(q.x*2.90+t*0.44)*cos(q.y*2.65+t*0.38)*sin(q.z*3.10+t*0.42)*0.26;
  /* Fine wrinkle */
  n += sin(q.x*5.10+t*0.72)*cos(q.y*4.75+t*0.62)*sin(q.z*5.40+t*0.68)*0.11;
  /* Micro surface */
  n += sin(q.x*7.60+t*1.10)*cos(q.y*7.20+t*0.98)*sin(q.z*7.90+t*1.06)*0.04;
  return n;
}

void main() {
  vec3  p = normal;
  float t = u_time * u_speed;

  /* Axis-asymmetric breathing — amplitudes match video swell rhythm */
  float bx = 1.0 + 0.20*sin(t*0.22 + 0.00);
  float by = 1.0 + 0.26*cos(t*0.18 + 2.10);
  float bz = 1.0 + 0.18*sin(t*0.25 + 4.20);

  vec3  q   = warpCoord(p, t);
  float n0  = blobN(q, t);

  /* u_amp=0.68 → deep enough folds to deform the silhouette clearly */
  float disp = n0 * u_amp;
  vec3 displaced = vec3(
    p.x * (0.66 + disp) * bx,
    p.y * (0.66 + disp) * by,
    p.z * (0.66 + disp) * bz
  );

  /* Numerical gradient on warped noise for correct crease normals */
  float e  = 0.015;
  float gx = (blobN(warpCoord(p+vec3(e,0,0),t), t) - n0) / e;
  float gy = (blobN(warpCoord(p+vec3(0,e,0),t), t) - n0) / e;
  float gz = (blobN(warpCoord(p+vec3(0,0,e),t), t) - n0) / e;
  vec3 grad = vec3(gx,gy,gz) * u_amp;
  vec3 gtan = grad - dot(grad,p)*p;
  vec3 dn   = normalize(p - gtan);

  vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
  v_viewPos  = mvPos.xyz;
  v_normal   = normalize(normalMatrix * dn);
  v_disp     = n0;

  gl_Position = projectionMatrix * mvPos;
}
`;

// ─────────────────────────────────────────────────────────────────
// FRAGMENT SHADER — precisely tuned from video frame analysis
//
//  The glassy transparent edge is the KEY visual:
//    Fresnel blends toward c3 (dark indigo = background colour),
//    NOT toward black. This makes the edge look like glass/water
//    fading into the background, exactly like the video.
//
//  Key light is upper-LEFT in the video (frames 1-10 consistent).
//  Body diffuse uses a 3-stop displacement ramp:
//    deep valley (c3 dark indigo) → mid fold (c2 purple) → crest (c1 magenta)
// ─────────────────────────────────────────────────────────────────
const FRAG = /* glsl */`
precision highp float;

uniform vec3 u_c1;    /* vivid warm magenta-purple — main surface colour */
uniform vec3 u_c2;    /* mid purple                                       */
uniform vec3 u_c3;    /* dark indigo — deepest pockets + edge             */
uniform vec3 u_spec;  /* near-white — fold-ridge specular                 */

varying vec3  v_normal;
varying vec3  v_viewPos;
varying float v_disp;

void main() {
  vec3  N   = normalize(v_normal);
  vec3  V   = normalize(-v_viewPos);
  float NdV = max(dot(N, V), 0.0);

  /* ── Key light: upper-left-front (from video analysis) ── */
  vec3  L1  = normalize(vec3(-1.8, 3.8, 3.5));
  float d1  = max(dot(N, L1), 0.0);
  vec3  H1  = normalize(L1 + V);
  float spec1 = pow(max(dot(N,H1),0.0), 160.0);  /* fold-ridge line  */
  float spec2 = pow(max(dot(N,H1),0.0),  30.0);  /* broad silk sheen */

  /* ── Fill light: soft right ── */
  vec3  L2 = normalize(vec3(3.0, 0.5, 2.0));
  float d2 = max(dot(N, L2), 0.0);

  /* ── Surface colour: vivid magenta by default, dark only in deep pockets */
  /* Use lighting + displacement together to drive colour                   */
  float lit    = d1 * 0.85 + d2 * 0.20;          /* 0 = unlit, 1 = fully lit */
  float depthT = clamp(v_disp * 1.5 + 0.7, 0.0, 1.0); /* 0=deep valley, 1=crest */
  float bright = clamp(lit * 0.7 + depthT * 0.5, 0.0, 1.0);

  /* Base colour — vivid c1 on lit crests, c3 only in deep dark pockets */
  vec3 col = mix(u_c3, u_c2, depthT);
       col = mix(col,  u_c1, clamp(bright, 0.0, 1.0));

  /* Emissive floor: minimum 28% of vivid c1 so blob is never pitch-black */
  col = max(col, u_c1 * 0.28);

  /* Specular highlights */
  col += u_spec * spec1 * 1.8;
  col += u_spec * spec2 * 0.18;

  /* Fresnel glassy edge — blends toward c3 (dark indigo background colour) */
  float fr = pow(1.0 - NdV, 2.8);
  col = mix(col, u_c3, fr * 0.60);

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
  const mountRef  = useRef<HTMLDivElement>(null);
  const propsRef  = useRef({ pulse, mood, animate, streamRate, state });
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
      renderer = new THREE.WebGLRenderer({
        alpha: true, antialias: true, powerPreference: 'high-performance',
      });
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
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0, 3.2);

    // ── 200-segment sphere for smooth domain-warped silk folds ─────
    const geo = new THREE.SphereGeometry(1, 200, 200);

    const pal0 = PAL.default;
    const uniforms = {
      // u_speed=0.65: matches the slow ~4.5s cycle measured in the video
      u_time:  { value: 0.0 },
      u_amp:   { value: 0.68 },
      u_speed: { value: 0.65 },
      u_c1:    { value: new THREE.Color(pal0.c1) },
      u_c2:    { value: new THREE.Color(pal0.c2) },
      u_c3:    { value: new THREE.Color(pal0.c3) },
      u_spec:  { value: new THREE.Color(pal0.spec) },
    };

    const mat  = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const blob = new THREE.Mesh(geo, mat);
    scene.add(blob);

    // ── Render loop ────────────────────────────────────────────────
    let startTs: number | null = null;
    let rafId   = 0;
    let alive   = true;

    const frame = (ts: number) => {
      if (!alive) return;
      rafId = requestAnimationFrame(frame);
      if (startTs === null) startTs = ts;
      const sec = (ts - startTs) * 0.001;

      const { pulse: p, mood: m, streamRate: sr } = propsRef.current;
      const pal   = PAL[m] || PAL.default;
      // pulse=true: speed up to ~2.8× for wild mode, amp stays close to base
      const speed = 0.65 + (p ? 1.10 : 0) + sr * 1.20;
      const amp   = 0.68 + (p ? 0.10 : 0) + sr * 0.07;

      uniforms.u_time.value  = sec;
      uniforms.u_speed.value = speed;
      uniforms.u_amp.value   = amp;
      uniforms.u_c1.value.set(pal.c1);
      uniforms.u_c2.value.set(pal.c2);
      uniforms.u_c3.value.set(pal.c3);
      uniforms.u_spec.value.set(pal.spec);

      /* Slow gentle rotation so all fold angles are visible */
      blob.rotation.y = sec * 0.07;
      blob.rotation.x = Math.sin(sec * 0.06) * 0.05;

      try { renderer.render(scene, camera); }
      catch { alive = false; setWebglOk(false); }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  // ── CSS glow ───────────────────────────────────────────────────
  const pal    = PAL[mood] || PAL.default;
  const r1     = Math.round(size * (pulse ? 0.38 : 0.22));
  const r2     = Math.round(size * (pulse ? 0.65 : 0.40));
  const glowCSS = `drop-shadow(0 0 ${r1}px ${pal.glow}) drop-shadow(0 0 ${r2}px ${pal.glow})`;

  const wrapAnim =
    state === 'error'      ? 'blobErr 1.40s cubic-bezier(.4,0,.2,1) forwards'
    : state === 'complete' ? 'blobVanish .72s ease-in forwards'
    : pulse                ? 'blobPulse 1.8s ease-in-out infinite'
    : 'none';

  // ── CSS fallback when WebGL is unavailable ──────────────────────
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
    <span
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        position:'relative', width:size, height:size, flexShrink:0,
        animation:wrapAnim, filter:glowCSS, willChange:'transform,opacity,filter',
      }}
    >
      <div ref={mountRef} style={{ lineHeight: 0 }} />
    </span>
  );
}
