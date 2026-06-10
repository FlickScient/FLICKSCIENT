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
  css: string;  // CSS fallback gradient
};

const PAL: Record<string, Pal> = {
  default:    { c1:'#CC33EE', c2:'#7700BB', c3:'#080012', spec:'#f6f0ff', glow:'rgba(160,0,255,0.65)',  css:'radial-gradient(circle,#CC33EE,#440077)' },
  horror:     { c1:'#EE1133', c2:'#880011', c3:'#0c0005', spec:'#ffe8ee', glow:'rgba(220,0,40,0.65)',   css:'radial-gradient(circle,#EE1133,#440008)' },
  romance:    { c1:'#EE3388', c2:'#990044', c3:'#0c0010', spec:'#ffe0f0', glow:'rgba(220,40,110,0.65)', css:'radial-gradient(circle,#EE3388,#550022)' },
  scifi:      { c1:'#22CCEE', c2:'#006688', c3:'#001018', spec:'#e0faff', glow:'rgba(20,180,230,0.65)', css:'radial-gradient(circle,#22CCEE,#003344)' },
  action:     { c1:'#EE6600', c2:'#883300', c3:'#0c0500', spec:'#fff0e0', glow:'rgba(220,80,0,0.65)',   css:'radial-gradient(circle,#EE6600,#441800)' },
  comedy:     { c1:'#DDBB00', c2:'#887700', c3:'#0c0c00', spec:'#fffce0', glow:'rgba(220,190,0,0.65)',  css:'radial-gradient(circle,#DDBB00,#443b00)' },
  drama:      { c1:'#2266EE', c2:'#113388', c3:'#000610', spec:'#e0eeff', glow:'rgba(50,100,220,0.65)', css:'radial-gradient(circle,#2266EE,#081844)' },
  fantasy:    { c1:'#9922EE', c2:'#550099', c3:'#08001a', spec:'#f0e0ff', glow:'rgba(140,50,220,0.65)', css:'radial-gradient(circle,#9922EE,#2a004c)' },
  thriller:   { c1:'#556688', c2:'#223344', c3:'#04080c', spec:'#e8edf2', glow:'rgba(60,90,140,0.65)',  css:'radial-gradient(circle,#556688,#111820)' },
  animation:  { c1:'#EE44AA', c2:'#990055', c3:'#0c0014', spec:'#ffe8f8', glow:'rgba(220,50,160,0.65)', css:'radial-gradient(circle,#EE44AA,#4c0028)' },
  documentary:{ c1:'#22AA66', c2:'#116633', c3:'#00100a', spec:'#e0fff0', glow:'rgba(40,170,100,0.65)', css:'radial-gradient(circle,#22AA66,#083319)' },
  mystery:    { c1:'#4488CC', c2:'#224488', c3:'#000810', spec:'#e0eef8', glow:'rgba(60,120,200,0.65)', css:'radial-gradient(circle,#4488CC,#112244)' },
  western:    { c1:'#CC9922', c2:'#886600', c3:'#0c0a00', spec:'#fff8e0', glow:'rgba(190,150,20,0.65)', css:'radial-gradient(circle,#CC9922,#443300)' },
  war:        { c1:'#667788', c2:'#334455', c3:'#060a0c', spec:'#edf0f2', glow:'rgba(80,110,155,0.65)', css:'radial-gradient(circle,#667788,#1a222a)' },
  music:      { c1:'#8822EE', c2:'#440099', c3:'#080018', spec:'#f2e0ff', glow:'rgba(120,30,220,0.65)', css:'radial-gradient(circle,#8822EE,#22004c)' },
  adventure:  { c1:'#22BB88', c2:'#116655', c3:'#00100c', spec:'#e0fff8', glow:'rgba(30,180,140,0.65)', css:'radial-gradient(circle,#22BB88,#083322)' },
  crime:      { c1:'#EE7722', c2:'#884400', c3:'#0c0600', spec:'#fff4e0', glow:'rgba(200,120,20,0.65)', css:'radial-gradient(circle,#EE7722,#442200)' },
  history:    { c1:'#CCAA44', c2:'#886622', c3:'#0c0a00', spec:'#fffae0', glow:'rgba(185,155,60,0.65)', css:'radial-gradient(circle,#CCAA44,#443311)' },
};

// ─────────────────────────────────────────────────────────────────
// VERTEX SHADER — domain-warped displacement for folded-silk look
//
//  Step 1: warp the unit-normal coordinates with large sinusoids
//  Step 2: sample 4-octave displacement in warped space
//  Result: patterns fold organically, creating deep fabric-like creases
// ─────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
precision highp float;

uniform float u_time;
uniform float u_amp;
uniform float u_speed;

varying vec3  v_normal;
varying vec3  v_viewPos;
varying float v_disp;

/* ── Domain warp: smoothly folds the coordinate space ────────── */
vec3 warpCoord(vec3 p, float t) {
  float w = 0.50;
  return vec3(
    p.x + w * sin(p.y*1.95 + t*0.24 + 0.00) * cos(p.z*1.70 + t*0.19),
    p.y + w * cos(p.x*1.80 + t*0.21 + 2.09) * sin(p.z*2.10 + t*0.23),
    p.z + w * sin(p.x*2.05 + t*0.23 + 4.19) * cos(p.y*1.90 + t*0.20)
  );
}

/* ── 4-octave noise in warped space ─────────────────────────── */
float blobN(vec3 q, float t) {
  float n = 0.0;
  /* Large primary folds (3-5 lobes across the sphere) */
  n += sin(q.x*1.65+t*0.28) * cos(q.y*1.95+t*0.22) * sin(q.z*1.80+t*0.25) * 0.52;
  /* Secondary crumple */
  n += sin(q.x*3.00+t*0.48) * cos(q.y*2.75+t*0.41) * sin(q.z*3.20+t*0.45) * 0.27;
  /* Fine surface wrinkle */
  n += sin(q.x*5.20+t*0.76) * cos(q.y*4.90+t*0.67) * sin(q.z*5.50+t*0.72) * 0.12;
  /* Micro detail */
  n += sin(q.x*7.80+t*1.20) * cos(q.y*7.40+t*1.05) * sin(q.z*8.10+t*1.15) * 0.05;
  return n;
}

void main() {
  vec3  p = normal;         /* unit sphere normal = position on unit sphere */
  float t = u_time * u_speed;

  /* Axis-asymmetric breathing so the silhouette shape shifts slowly */
  float bx = 1.0 + 0.13*sin(t*0.23 + 0.00);
  float by = 1.0 + 0.17*cos(t*0.19 + 2.10);
  float bz = 1.0 + 0.11*sin(t*0.27 + 4.20);

  vec3  q  = warpCoord(p, t);
  float n0 = blobN(q, t);

  /* Large displacement — creates deep, prominent folds */
  float disp = n0 * u_amp;
  vec3 displaced = vec3(
    p.x * (0.66 + disp) * bx,
    p.y * (0.66 + disp) * by,
    p.z * (0.66 + disp) * bz
  );

  /* Numerical gradient on warped noise for accurate crease normals */
  float e = 0.015;
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
// FRAGMENT SHADER — folded silk / crumpled foil shading
//
//  Key visual targets from reference images:
//   • Deep dark concave pockets (near-black purple)
//   • Vivid magenta-purple sweeping curved surfaces
//   • Thin bright white fold-ridge specular lines
//   • Smooth Fresnel edge that blends into dark background
// ─────────────────────────────────────────────────────────────────
const FRAG = /* glsl */`
precision highp float;

uniform vec3 u_c1;    /* vivid body — magenta-purple   */
uniform vec3 u_c2;    /* mid shadow                    */
uniform vec3 u_c3;    /* deep shadow / background edge */
uniform vec3 u_spec;  /* fold-ridge specular highlight */

varying vec3  v_normal;
varying vec3  v_viewPos;
varying float v_disp;

void main() {
  vec3  N   = normalize(v_normal);
  vec3  V   = normalize(-v_viewPos);
  float NdV = max(dot(N,V), 0.0);

  /* ── Key light: white, upper-front-right (main fold illumination) */
  vec3  L1  = normalize(vec3(1.8,  3.5,  4.0));
  float d1  = max(dot(N,L1), 0.0);
  vec3  H1  = normalize(L1+V);
  float NdH1 = max(dot(N,H1), 0.0);
  /* Two spec lobes: razor-thin ridge line + broad silk sheen */
  float s1sharp = pow(NdH1, 240.0);  /* knife-edge fold ridges    */
  float s1soft  = pow(NdH1,  45.0);  /* broad silk sheen          */

  /* ── Fill light: soft lavender from upper-left ── */
  vec3  L2  = normalize(vec3(-2.5, 1.5, 2.0));
  float d2  = max(dot(N,L2), 0.0);

  /* ── Back-bottom accent — warms deep folds ── */
  vec3  L3  = normalize(vec3(0.3, -3.0, -1.5));
  float d3  = max(dot(N,L3), 0.0);

  /* ── Displacement-based body colour ─────────────────────────── */
  /* t_c = 0 → deep concave pocket, 1 → high crest (facing light) */
  float t_c = clamp(v_disp * 2.8 + 0.55, 0.0, 1.0);
  vec3 body  = mix(u_c3, u_c2, clamp(t_c*1.4, 0.0, 1.0));
       body  = mix(body, u_c1, clamp((t_c-0.3)*1.6, 0.0, 1.0));
  /* Extra brightness near fold crests */
  body = mix(body, u_spec*0.72, clamp((t_c-0.75)*4.0, 0.0, 1.0));

  /* ── Lighting ─────────────────────────────────────────────── */
  vec3 ambient  = u_c3 * 0.28;
  vec3 diffuse  = body * (d1*0.72 + d2*0.20 + d3*0.12);
  vec3 specular = u_spec * s1sharp * 2.20          /* bright fold-ridge line */
                + u_spec * 0.38  * s1soft  * 0.50; /* broad silk reflection  */

  vec3 col = ambient + diffuse + specular;

  /* ── Fresnel edge — pull silhouette into near-black ───────── */
  float fr = pow(1.0 - NdV, 2.8);
  col = mix(col, u_c3 * 0.25, fr * 0.90);

  /* ── AO proxy — darken vertices deep in concave folds ──────── */
  float ao = clamp(v_disp * 2.0 + 0.58, 0.0, 1.0);
  col *= (0.50 + 0.50 * ao);

  /* ── Subtle colour shift: concave pockets tint blue-purple ── */
  col = mix(col, col * vec3(0.75, 0.70, 1.20), clamp((-v_disp)*1.5, 0.0, 0.35));

  gl_FragColor = vec4(col, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────
// CSS keyframes — injected once
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
  0%,100% {opacity:.8}
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

    // Check context was actually created
    if (!renderer.getContext()) {
      renderer.dispose();
      setWebglOk(false);
      return;
    }

    container.appendChild(renderer.domElement);

    // ── Scene / Camera ───────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0, 3.2);

    // ── High-resolution sphere for smooth domain-warped folds ────
    // 200 segments gives enough vertex density for the large-amplitude
    // domain-warped displacement to produce smooth silk-like curves
    const geo = new THREE.SphereGeometry(1, 200, 200);

    const pal0 = PAL.default;
    const uniforms = {
      u_time:  { value: 0.0 },
      u_amp:   { value: 0.62 },
      u_speed: { value: 1.0 },
      u_c1:    { value: new THREE.Color(pal0.c1) },
      u_c2:    { value: new THREE.Color(pal0.c2) },
      u_c3:    { value: new THREE.Color(pal0.c3) },
      u_spec:  { value: new THREE.Color(pal0.spec) },
    };

    const mat  = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const blob = new THREE.Mesh(geo, mat);
    scene.add(blob);

    // ── Render loop ───────────────────────────────────────────────
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
      const speed = 1.0 + (p ? 1.70 : 0) + sr * 1.40;
      const amp   = 0.62 + (p ? 0.13 : 0) + sr * 0.08;

      uniforms.u_time.value  = sec;
      uniforms.u_speed.value = speed;
      uniforms.u_amp.value   = amp;
      uniforms.u_c1.value.set(pal.c1);
      uniforms.u_c2.value.set(pal.c2);
      uniforms.u_c3.value.set(pal.c3);
      uniforms.u_spec.value.set(pal.spec);

      /* Very slow rotation — lets you see folds from all angles */
      blob.rotation.y = sec * 0.080;
      blob.rotation.x = Math.sin(sec * 0.065) * 0.055;

      try {
        renderer.render(scene, camera);
      } catch {
        alive = false;
        setWebglOk(false);
      }
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

  // ── CSS glow + animation ────────────────────────────────────────
  const pal    = PAL[mood] || PAL.default;
  const r1     = Math.round(size * (pulse ? 0.40 : 0.25));
  const r2     = Math.round(size * (pulse ? 0.70 : 0.45));
  const glowCSS = `drop-shadow(0 0 ${r1}px ${pal.glow}) drop-shadow(0 0 ${r2}px ${pal.glow})`;

  const wrapAnim =
    state === 'error'    ? 'blobErr 1.40s cubic-bezier(.4,0,.2,1) forwards'
    : state === 'complete' ? 'blobVanish .72s ease-in forwards'
    : pulse               ? 'blobPulse 1.8s ease-in-out infinite'
    : 'none';

  // ── CSS fallback if WebGL unavailable ───────────────────────────
  if (!webglOk) {
    return (
      <span style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          size,
        height:         size,
        flexShrink:     0,
        borderRadius:   '50%',
        background:     pal.css,
        filter:         glowCSS,
        animation:      wrapAnim,
      }} />
    );
  }

  return (
    <span
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        position:       'relative',
        width:          size,
        height:         size,
        flexShrink:     0,
        animation:      wrapAnim,
        filter:         glowCSS,
        willChange:     'transform, opacity, filter',
      }}
    >
      <div ref={mountRef} style={{ lineHeight: 0 }} />
    </span>
  );
}
