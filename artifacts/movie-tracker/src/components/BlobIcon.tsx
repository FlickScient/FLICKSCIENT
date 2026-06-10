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
  c1: string;
  c2: string;
  c3: string;
  spec: string;
  glow: string;
  css: string;
};

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
// VERTEX SHADER
//
//  Reference analysis: the orb stays ROUND. The folds are large and
//  smooth (3-5 big folds), like crumpled silk. Low frequency noise
//  with small amplitude keeps the silhouette circular.
//  Domain warp is light — enough to make folds organic, not spiky.
// ─────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
precision highp float;

uniform float u_time;
uniform float u_amp;
uniform float u_speed;

varying vec3  v_normal;
varying vec3  v_viewPos;
varying float v_disp;

/* ── Light domain warp — keeps folds organic but not chaotic ── */
vec3 warpCoord(vec3 p, float t) {
  float w = 0.30;
  return vec3(
    p.x + w * sin(p.y * 1.2 + t * 0.18),
    p.y + w * cos(p.x * 1.1 + t * 0.16 + 2.1),
    p.z + w * sin(p.z * 1.3 + t * 0.17 + 4.2)
  );
}

/* ── 2-octave LOW-frequency noise — big smooth folds only ─── */
/* Reference has ~3-5 large folds, not bumpy high-freq surface */
float blobN(vec3 q, float t) {
  float n = 0.0;
  /* Primary — very large folds, frequency 0.85 */
  n += sin(q.x*0.85+t*0.18)*cos(q.y*0.95+t*0.15)*sin(q.z*0.90+t*0.17) * 0.65;
  /* Secondary — medium folds for crumple detail */
  n += sin(q.x*1.80+t*0.32)*cos(q.y*1.70+t*0.28)*sin(q.z*1.90+t*0.30) * 0.28;
  /* Slight crinkle at ridges only */
  n += sin(q.x*3.50+t*0.60)*cos(q.y*3.20+t*0.55)*sin(q.z*3.70+t*0.58) * 0.07;
  return n;
}

void main() {
  vec3  p = normal;
  float t = u_time * u_speed;

  vec3  q   = warpCoord(p, t);
  float n0  = blobN(q, t);

  /* Low amplitude (0.38) so overall shape stays ROUND like reference */
  float disp    = n0 * u_amp;
  vec3 displaced = p * (0.72 + disp);

  /* Numerical gradient for crease normals */
  float e  = 0.020;
  float gx = (blobN(warpCoord(p+vec3(e,0,0),t), t) - n0) / e;
  float gy = (blobN(warpCoord(p+vec3(0,e,0),t), t) - n0) / e;
  float gz = (blobN(warpCoord(p+vec3(0,0,e),t), t) - n0) / e;
  vec3 grad = vec3(gx, gy, gz) * u_amp;
  vec3 gtan = grad - dot(grad, p) * p;
  vec3 dn   = normalize(p - gtan * 0.8);

  vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
  v_viewPos  = mvPos.xyz;
  v_normal   = normalize(normalMatrix * dn);
  v_disp     = n0;

  gl_Position = projectionMatrix * mvPos;
}
`;

// ─────────────────────────────────────────────────────────────────
// FRAGMENT SHADER
//
//  Reference colours:
//    c1 = #C030C0 vivid magenta — covers MOST of the lit surface
//    c2 = #7A1EA8 mid purple    — shadow faces
//    c3 = #1e1550 dark indigo  — deep fold pockets (inside valleys)
//    spec = #f2eeff near-white — thin fold-ridge lines + silk sheen
//
//  Glassy transparent edge: alpha fades at grazing angles (Fresnel).
//  DoubleSide on, so fold interiors render and show dark valleys.
//  Back faces are darker (inside of the silk folds).
// ─────────────────────────────────────────────────────────────────
const FRAG = /* glsl */`
precision highp float;

uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_spec;

varying vec3  v_normal;
varying vec3  v_viewPos;
varying float v_disp;

void main() {
  /* Back-face: flip normal so interior fold faces shade correctly */
  vec3  N   = normalize(v_normal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3  V   = normalize(-v_viewPos);
  float NdV = max(dot(N, V), 0.0);

  /* ── Key light: upper-left (matches reference video) ── */
  vec3  L1    = normalize(vec3(-1.5, 3.5, 3.0));
  float d1    = max(dot(N, L1), 0.0);
  vec3  H1    = normalize(L1 + V);
  float NdH1  = max(dot(N, H1), 0.0);
  float sLine = pow(NdH1, 180.0);   /* sharp fold-ridge highlight line */
  float sSilk = pow(NdH1,  25.0);   /* broad silk sheen */

  /* ── Warm fill light: right ── */
  vec3  L2 = normalize(vec3(2.5, 0.5, 2.0));
  float d2 = max(dot(N, L2), 0.0);

  /* ── Base colour from displacement ── */
  /* Neutral surfaces (v_disp≈0) show vivid c1.                     */
  /* Only negative displacement (deep valleys) drops toward c3.     */
  float depthT = clamp(v_disp * 1.2 + 0.75, 0.0, 1.0);
  vec3 body = mix(u_c3, u_c2, clamp(depthT * 1.5, 0.0, 1.0));
       body = mix(body, u_c1, clamp(depthT * 1.8 - 0.2, 0.0, 1.0));

  /* ── Lighting ── */
  /* Back faces get darker inner-fold colour (like seeing silk interior) */
  float frontBoost = gl_FrontFacing ? 1.0 : 0.45;
  vec3 col = body * (d1 * 0.90 + d2 * 0.22 + 0.18) * frontBoost;

  /* Emissive floor — blob is never pitch black, always shows c1 hue */
  col = max(col, u_c1 * (gl_FrontFacing ? 0.22 : 0.08));

  /* Specular only on front faces */
  if (gl_FrontFacing) {
    col += u_spec * sLine * 2.0;
    col += u_spec * sSilk * 0.15 * d1;
  }

  /* ── Glassy transparent edge via alpha ── */
  /* At grazing angles (NdV→0), alpha fades to ~0 → looks transparent */
  /* This is the KEY to the thin glassy fins visible in the reference  */
  float alpha = 0.20 + 0.80 * pow(NdV, 0.45);
  /* Back faces (inside folds) are semi-transparent */
  if (!gl_FrontFacing) alpha *= 0.55;

  gl_FragColor = vec4(col, alpha);
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

    // ── High-segment sphere for smooth large folds ─────────────────
    const geo = new THREE.SphereGeometry(1, 160, 160);

    const pal0 = PAL.default;
    const uniforms = {
      u_time:  { value: 0.0 },
      u_amp:   { value: 0.38 },   // low amp → shape stays round like reference
      u_speed: { value: 0.55 },   // slow organic motion
      u_c1:    { value: new THREE.Color(pal0.c1) },
      u_c2:    { value: new THREE.Color(pal0.c2) },
      u_c3:    { value: new THREE.Color(pal0.c3) },
      u_spec:  { value: new THREE.Color(pal0.spec) },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,       // enables alpha for glassy edge fade
      side: THREE.DoubleSide,  // see fold interiors (dark valleys visible through top)
      depthWrite: false,        // correct transparency sorting
    });

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
      const speed = 0.55 + (p ? 0.90 : 0) + sr * 1.0;
      const amp   = 0.38 + (p ? 0.08 : 0) + sr * 0.06;

      uniforms.u_time.value  = sec;
      uniforms.u_speed.value = speed;
      uniforms.u_amp.value   = amp;
      uniforms.u_c1.value.set(pal.c1);
      uniforms.u_c2.value.set(pal.c2);
      uniforms.u_c3.value.set(pal.c3);
      uniforms.u_spec.value.set(pal.spec);

      /* Very slow gentle rotation — shows all fold angles */
      blob.rotation.y = sec * 0.06;
      blob.rotation.x = Math.sin(sec * 0.05) * 0.04;

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
