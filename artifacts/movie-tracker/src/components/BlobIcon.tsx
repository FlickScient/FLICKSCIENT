// @ts-nocheck
import React, { useRef, useEffect } from 'react';
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
  glow: string;
};

const PAL: Record<string, Pal> = {
  default:    { c1:'#DD55FF', c2:'#8B00FF', c3:'#120022', glow:'rgba(139,0,255,0.72)' },
  horror:     { c1:'#FF2244', c2:'#990000', c3:'#140005', glow:'rgba(200,0,40,0.72)'  },
  romance:    { c1:'#FF55AA', c2:'#CC2277', c3:'#140010', glow:'rgba(220,40,110,0.72)'},
  scifi:      { c1:'#44EEFF', c2:'#0088BB', c3:'#001520', glow:'rgba(20,180,230,0.72)'},
  action:     { c1:'#FF8800', c2:'#CC4400', c3:'#140800', glow:'rgba(220,80,0,0.72)'  },
  comedy:     { c1:'#FFEE22', c2:'#CCAA00', c3:'#141400', glow:'rgba(220,190,0,0.72)' },
  drama:      { c1:'#5599FF', c2:'#2244BB', c3:'#000618', glow:'rgba(50,100,210,0.72)'},
  fantasy:    { c1:'#BB66FF', c2:'#7722CC', c3:'#0b0020', glow:'rgba(130,50,220,0.72)'},
  thriller:   { c1:'#7799BB', c2:'#334466', c3:'#060c12', glow:'rgba(60,90,140,0.72)' },
  animation:  { c1:'#FF66CC', c2:'#CC2288', c3:'#140016', glow:'rgba(220,50,160,0.72)'},
  documentary:{ c1:'#44CC88', c2:'#228855', c3:'#00150a', glow:'rgba(40,170,100,0.72)'},
  mystery:    { c1:'#66AADD', c2:'#2255AA', c3:'#000b18', glow:'rgba(60,120,190,0.72)'},
  western:    { c1:'#DDBB44', c2:'#AA7700', c3:'#141000', glow:'rgba(190,150,20,0.72)'},
  war:        { c1:'#99AABB', c2:'#445566', c3:'#08090e', glow:'rgba(80,110,155,0.72)'},
  music:      { c1:'#AA44FF', c2:'#6600CC', c3:'#0b0018', glow:'rgba(120,30,220,0.72)'},
  adventure:  { c1:'#44DDAA', c2:'#118866', c3:'#001510', glow:'rgba(30,180,140,0.72)'},
  crime:      { c1:'#FF9944', c2:'#CC5500', c3:'#140900', glow:'rgba(200,120,20,0.72)'},
  history:    { c1:'#EEBB66', c2:'#AA7722', c3:'#141000', glow:'rgba(185,155,60,0.72)'},
};

// ─────────────────────────────────────────────────────────────────
// VERTEX SHADER
//  High-density sphere (128×128) displaced by 5-octave asymmetric
//  sin/cos noise.  Normals recomputed via numerical gradient so
//  specular highlights land correctly on every crumple.
// ─────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
precision highp float;

uniform float u_time;
uniform float u_amp;
uniform float u_speed;

varying vec3  v_normal;
varying vec3  v_viewPos;
varying float v_disp;

/* 5-octave asymmetric noise: very different freq/phase per axis
   so the blob never looks like a symmetrical sine-wave sphere   */
float sn(vec3 p, float t) {
  float n = 0.0;
  /* Slow large folds — dominant crumple silhouette */
  n += sin(p.x*1.70+t*0.38)*cos(p.y*2.20+t*0.29)*sin(p.z*1.95+t*0.34)*0.52;
  /* Medium ripple */
  n += sin(p.x*3.10+t*0.72)*cos(p.y*2.80+t*0.55)*sin(p.z*3.40+t*0.63)*0.27;
  /* Fast surface crumple */
  n += sin(p.x*5.50+t*1.20)*cos(p.y*6.10+t*0.98)*sin(p.z*4.80+t*1.05)*0.14;
  /* Fine wrinkle */
  n += sin(p.x*8.30+t*1.80)*cos(p.y*7.60+t*1.55)*sin(p.z*8.90+t*1.90)*0.07;
  /* Micro detail */
  n += cos(p.x*12.8+t*2.50)*sin(p.y*11.9+t*2.15)*cos(p.z*13.4+t*2.65)*0.03;
  return n;
}

void main() {
  vec3  p = normal;            /* unit-sphere position = surface normal */
  float t = u_time * u_speed;

  /* Slow axis-asymmetric breathing so shape is never a perfect sphere */
  float bx = 1.0 + 0.12*sin(t*0.28+0.50);
  float by = 1.0 + 0.18*cos(t*0.22+1.20);
  float bz = 1.0 + 0.10*sin(t*0.34+2.10);

  float n0   = sn(p, t);
  float disp = n0 * u_amp;

  /* Displace outward — each axis breathes independently */
  vec3 displaced = vec3(
    p.x * (0.70 + disp) * bx,
    p.y * (0.70 + disp) * by,
    p.z * (0.70 + disp) * bz
  );

  /* Numerical gradient → perturbed normal for correct lighting */
  float e  = 0.018;
  float gx = (sn(p+vec3(e,0,0),t) - n0) / e;
  float gy = (sn(p+vec3(0,e,0),t) - n0) / e;
  float gz = (sn(p+vec3(0,0,e),t) - n0) / e;
  vec3 grad = vec3(gx,gy,gz) * u_amp;
  vec3 gtan = grad - dot(grad,p)*p;
  vec3 dn   = normalize(p - gtan);

  v_normal  = normalize(normalMatrix * dn);
  v_disp    = n0;

  vec4 mvPos  = modelViewMatrix * vec4(displaced, 1.0);
  v_viewPos   = mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`;

// ─────────────────────────────────────────────────────────────────
// FRAGMENT SHADER
//  3-light Blinn-Phong · displacement-based colour blend · Fresnel
// ─────────────────────────────────────────────────────────────────
const FRAG = /* glsl */`
precision highp float;

uniform vec3 u_c1;   /* magenta fold-peak   */
uniform vec3 u_c2;   /* violet body         */
uniform vec3 u_c3;   /* deep-purple shadow  */

varying vec3  v_normal;
varying vec3  v_viewPos;
varying float v_disp;

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(-v_viewPos);

  /* Key light — blinding white, upper-right-front */
  vec3  L1 = normalize(vec3( 2.8, 3.8, 4.5));
  float d1 = max(dot(N,L1), 0.0);
  vec3  H1 = normalize(L1+V);
  float s1 = pow(max(dot(N,H1),0.0), 160.0);  /* very tight gloss */

  /* Fill — violet tint, left side */
  vec3  L2 = normalize(vec3(-3.2,-0.8, 2.5));
  float d2 = max(dot(N,L2), 0.0);
  vec3  H2 = normalize(L2+V);
  float s2 = pow(max(dot(N,H2),0.0),  50.0);

  /* Rim — magenta haze, back-bottom */
  vec3  L3 = normalize(vec3( 0.6,-4.0,-2.0));
  float d3 = max(dot(N,L3), 0.0);

  /* Colour ramp: shadow → body → fold-peak driven by displacement */
  float t2  = clamp(v_disp*2.8+0.5, 0.0, 1.0);
  vec3 base = mix(u_c3, u_c2, t2);
  base = mix(base, u_c1, clamp((t2-0.55)*2.8, 0.0, 1.0));

  vec3 ambient  = u_c3 * 0.18;
  vec3 diffuse  = base * (d1*0.80 + d2*0.28 + d3*0.16)
                + u_c1 * d3 * 0.08;          /* faint magenta rim bleed */
  vec3 specular = vec3(1.00,0.96,1.00)*s1*1.55   /* near-white glare      */
                + vec3(0.78,0.46,1.00)*s2*0.65;  /* violet second shine   */

  vec3 col = ambient + diffuse + specular;

  /* Fresnel — pulls silhouette edge into deep purple */
  float fr = pow(1.0-max(dot(N,V),0.0), 3.0);
  col = mix(col, u_c3*0.45, fr*0.72);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────
// CSS keyframes (injected once)
// ─────────────────────────────────────────────────────────────────
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected || typeof document === 'undefined') return;
  _cssInjected = true;
  const el = document.createElement('style');
  el.textContent = `
@keyframes blobErr {
  0%   {transform:scale(1);    opacity:1;   filter:blur(0)}
  20%  {transform:scale(1.6);  opacity:.85; filter:blur(1px)}
  42%  {transform:scale(3.0);  opacity:.50; filter:saturate(5) blur(7px)}
  60%  {transform:scale(.10);  opacity:.05; filter:blur(12px)}
  80%  {transform:scale(1.06); opacity:.75; filter:blur(0)}
  100% {transform:scale(1);    opacity:1;   filter:blur(0)}
}
@keyframes blobVanish {
  0%   {transform:scale(1);    opacity:1}
  28%  {transform:scale(1.24); opacity:.95}
  100% {transform:scale(0);    opacity:0}
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
  propsRef.current = { pulse, mood, animate, streamRate, state };

  injectCSS();

  /* fire onVanished after the complete animation finishes */
  useEffect(() => {
    if (state !== 'complete' || !onVanished) return;
    const id = setTimeout(onVanished, 720);
    return () => clearTimeout(id);
  }, [state, onVanished]);

  /* Three.js scene — tears down and rebuilds only when size changes */
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── Renderer ────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Scene / Camera ───────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 50);
    camera.position.set(0, 0, 3.0);

    // ── Blob geometry + ShaderMaterial ──────────────────────────
    const geo = new THREE.SphereGeometry(1, 128, 128);

    const uniforms = {
      u_time:  { value: 0.0 },
      u_amp:   { value: 0.38 },
      u_speed: { value: 1.0 },
      u_c1:    { value: new THREE.Color('#DD55FF') },
      u_c2:    { value: new THREE.Color('#8B00FF') },
      u_c3:    { value: new THREE.Color('#120022') },
    };

    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const blob = new THREE.Mesh(geo, mat);
    scene.add(blob);

    // ── Particles ────────────────────────────────────────────────
    const PC        = 28;
    const pPos      = new Float32Array(PC * 3);
    const pPhase    = new Float32Array(PC);
    const pRadius   = new Float32Array(PC);
    const pTheta    = new Float32Array(PC);
    const pPhi      = new Float32Array(PC);
    const pSpeedArr = new Float32Array(PC);

    for (let i = 0; i < PC; i++) {
      pPhase[i]    = Math.random() * Math.PI * 2;
      pRadius[i]   = 1.12 + Math.random() * 0.52;
      pTheta[i]    = Math.random() * Math.PI * 2;
      pPhi[i]      = Math.acos(2 * Math.random() - 1);
      pSpeedArr[i] = 0.18 + Math.random() * 0.26;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
      color:           0xcc77ff,
      size:            size < 50 ? 0.060 : 0.048,
      transparent:     true,
      opacity:         0.70,
      sizeAttenuation: true,
      depthWrite:      false,
    });

    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // ── Animation loop ───────────────────────────────────────────
    let startTs: number | null = null;
    let rafId = 0;

    const frame = (ts: number) => {
      rafId = requestAnimationFrame(frame);

      if (startTs === null) startTs = ts;
      const sec = (ts - startTs) * 0.001;

      const { pulse: p, mood: m, animate: anim, streamRate: sr } = propsRef.current;

      const pal   = PAL[m] || PAL.default;
      const speed = 1.0 + (p ? 1.80 : 0) + sr * 1.50;
      const amp   = 0.38 + (p ? 0.16 : 0) + sr * 0.10;

      uniforms.u_time.value  = sec;
      uniforms.u_speed.value = speed;
      uniforms.u_amp.value   = amp;
      uniforms.u_c1.value.set(pal.c1);
      uniforms.u_c2.value.set(pal.c2);
      uniforms.u_c3.value.set(pal.c3);

      /* Slow tumble for depth */
      blob.rotation.y = sec * 0.11;
      blob.rotation.x = Math.sin(sec * 0.09) * 0.07;

      /* Animate particles in spherical coordinates */
      const posArr     = pGeo.attributes.position.array as Float32Array;
      const pScaleR    = p ? 1.25 : 1.0;
      const pSpeedMul  = p ? 2.0  : 1.0;

      for (let i = 0; i < PC; i++) {
        const orbit = sec * pSpeedArr[i] * pSpeedMul + pPhase[i];
        const r   = pRadius[i] * pScaleR * (1.0 + 0.22 * Math.sin(sec * 0.45 + pPhase[i]));
        const phi = pPhi[i]   + sec * 0.06 * pSpeedArr[i];
        const th  = pTheta[i] + orbit;
        posArr[i*3]   = r * Math.sin(phi) * Math.cos(th);
        posArr[i*3+1] = r * Math.cos(phi) + 0.04 * Math.sin(sec * 0.8 + pPhase[i]);
        posArr[i*3+2] = r * Math.sin(phi) * Math.sin(th);
      }
      pGeo.attributes.position.needsUpdate = true;

      /* Pulse: particles breathe brighter + bigger */
      pMat.opacity = p
        ? 0.88 + 0.12 * Math.sin(sec * 4.2)
        : 0.50 + 0.18 * Math.sin(sec * 1.1);
      pMat.size = p
        ? (size < 50 ? 0.082 : 0.068) * (1.0 + 0.28 * Math.sin(sec * 3.8))
        : (size < 50 ? 0.060 : 0.048);

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(frame);

    // ── Cleanup ──────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      pGeo.dispose();
      pMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  // ── CSS glow ─────────────────────────────────────────────────
  const pal    = PAL[mood] || PAL.default;
  const r1     = Math.round(size * (pulse ? 0.35 : 0.22));
  const r2     = Math.round(size * (pulse ? 0.60 : 0.40));
  const glowCSS = `drop-shadow(0 0 ${r1}px ${pal.glow}) drop-shadow(0 0 ${r2}px ${pal.glow})`;

  const wrapAnim =
    state === 'error'    ? 'blobErr 1.40s cubic-bezier(.4,0,.2,1) forwards'
    : state === 'complete' ? 'blobVanish .72s ease-in forwards'
    : 'none';

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
