// @ts-nocheck
import React, { useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
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
  streamRate?: number;   // 0.0–1.0  how fast tokens are arriving
  onVanished?: () => void;
}

// ─────────────────────────────────────────────────────────
// Mood palettes  (color1 = bright fold peaks, color2 = body)
// ─────────────────────────────────────────────────────────
type Pal = { c1: [number, number, number]; c2: [number, number, number]; gr: [number, number, number] };
const PAL: Record<string, Pal> = {
  default:    { c1:[0.80,0.05,0.90], c2:[0.48,0.00,0.56], gr:[136,0,220] },
  horror:     { c1:[0.90,0.10,0.05], c2:[0.55,0.00,0.00], gr:[200,0,0]   },
  romance:    { c1:[0.95,0.30,0.65], c2:[0.60,0.05,0.35], gr:[220,50,130]},
  scifi:      { c1:[0.15,0.85,0.95], c2:[0.05,0.45,0.65], gr:[20,170,220]},
  action:     { c1:[0.95,0.50,0.05], c2:[0.55,0.22,0.00], gr:[220,80,0]  },
  comedy:     { c1:[0.95,0.85,0.10], c2:[0.55,0.45,0.00], gr:[220,180,0] },
  drama:      { c1:[0.30,0.55,0.95], c2:[0.10,0.25,0.55], gr:[50,100,200]},
  fantasy:    { c1:[0.70,0.30,0.95], c2:[0.38,0.08,0.55], gr:[130,50,210]},
  thriller:   { c1:[0.45,0.55,0.70], c2:[0.15,0.20,0.30], gr:[60,90,130] },
  animation:  { c1:[0.95,0.40,0.80], c2:[0.55,0.10,0.40], gr:[220,50,150]},
  documentary:{ c1:[0.30,0.80,0.55], c2:[0.10,0.45,0.25], gr:[40,160,90] },
  mystery:    { c1:[0.45,0.65,0.85], c2:[0.15,0.30,0.50], gr:[70,120,180]},
  western:    { c1:[0.85,0.70,0.20], c2:[0.50,0.38,0.05], gr:[180,140,20]},
  war:        { c1:[0.55,0.65,0.75], c2:[0.20,0.28,0.36], gr:[80,110,150]},
  music:      { c1:[0.65,0.20,0.95], c2:[0.35,0.05,0.55], gr:[120,30,210]},
  adventure:  { c1:[0.25,0.85,0.70], c2:[0.08,0.48,0.38], gr:[30,170,130]},
  crime:      { c1:[0.90,0.55,0.20], c2:[0.52,0.25,0.05], gr:[190,110,20]},
  history:    { c1:[0.88,0.72,0.40], c2:[0.50,0.38,0.15], gr:[180,150,60]},
};

// ─────────────────────────────────────────────────────────
// GLSL — Vertex Shader
//   Unit-sphere vertex shader with multi-octave sin noise
//   displacement + numerically-corrected normals
// ─────────────────────────────────────────────────────────
const VERT = `
precision highp float;

attribute vec3 a_n;          /* unit-sphere position = surface normal */

uniform mat4  u_proj;
uniform mat4  u_mv;
uniform mat3  u_nm;
uniform float u_t;           /* time  */
uniform float u_amp;         /* displacement amplitude */

varying vec3 v_n;
varying vec3 v_p;

/* 4-octave smooth noise on a unit sphere */
float sn(vec3 p) {
  float n;
  n  = sin(p.x*2.30+u_t*.65) * cos(p.y*1.90+u_t*.42) * sin(p.z*2.10+u_t*.55) * .40;
  n += sin(p.x*3.80+u_t*1.25)* cos(p.y*3.50+u_t*.90) * sin(p.z*3.70+u_t*1.10)* .28;
  n += sin(p.x*5.50+u_t*.45) * cos(p.y*5.20+u_t*.35) * sin(p.z*5.80+u_t*.48) * .18;
  n += sin(p.x*7.20+u_t*1.85)* cos(p.y*7.80+u_t*2.10)* sin(p.z*6.90+u_t*1.65)* .10;
  n += cos(p.x*9.10+u_t*.95) * sin(p.y*8.70+u_t*.75) * cos(p.z*9.30+u_t*1.05)* .04;
  return n;
}

void main() {
  float n0 = sn(a_n);

  /* displace outward along the surface normal */
  vec3 pos = a_n * 0.75 + a_n * (n0 * u_amp);

  /* numerical gradient → displaced normal */
  float e = 0.025;
  float gx = (sn(a_n + vec3(e,0.,0.)) - n0) / e;
  float gy = (sn(a_n + vec3(0.,e,0.)) - n0) / e;
  float gz = (sn(a_n + vec3(0.,0.,e)) - n0) / e;
  vec3  grad = vec3(gx, gy, gz) * u_amp;
  vec3  gtan = grad - dot(grad, a_n) * a_n;   /* tangential component */
  vec3  dn   = normalize(a_n - gtan);

  vec4 mvp = u_mv * vec4(pos, 1.0);
  v_p = mvp.xyz;
  v_n = normalize(u_nm * dn);

  gl_Position = u_proj * mvp;
}
`;

// ─────────────────────────────────────────────────────────
// GLSL — Fragment Shader
//   Blinn-Phong with 3 lights + Fresnel edge darkening
// ─────────────────────────────────────────────────────────
const FRAG = `
precision mediump float;

varying vec3 v_n;
varying vec3 v_p;

uniform vec3 u_c1;   /* bright fold-peak color  */
uniform vec3 u_c2;   /* body / shadow color     */

void main() {
  vec3 N = normalize(v_n);
  vec3 V = normalize(-v_p);            /* camera at origin in view space */

  /* --- Key light: white, upper-right-front ---- */
  vec3 L1  = normalize(vec3(3.0, 4.0, 3.5) - v_p);
  float d1 = max(dot(N, L1), 0.0);
  vec3  H1 = normalize(L1 + V);
  float s1 = pow(max(dot(N, H1), 0.0), 72.0);

  /* --- Fill light: violet, left side ---------- */
  vec3 L2  = normalize(vec3(-4.0, -1.0, 2.0) - v_p);
  float d2 = max(dot(N, L2), 0.0);
  vec3  H2 = normalize(L2 + V);
  float s2 = pow(max(dot(N, H2), 0.0), 28.0);

  /* --- Rim light: below-back, gives depth ----- */
  vec3 L3  = normalize(vec3(1.0, -4.0, -2.0) - v_p);
  float d3 = max(dot(N, L3), 0.0);

  vec3 ambient  = u_c2 * 0.10;
  vec3 diffuse  = u_c1 * (d1 * 0.82)
                + u_c2 * (d2 * 0.36)
                + u_c2 * (d3 * 0.20);
  vec3 specular = vec3(1.00, 0.95, 1.00) * s1 * 0.90    /* white shine   */
                + vec3(0.75, 0.45, 1.00) * s2 * 0.42;   /* violet sheen  */

  vec3 col = ambient + diffuse + specular;

  /* Fresnel — darkens edges → sphere silhouette */
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.8);
  col = mix(col, vec3(0.02, 0.00, 0.06), fr * 0.83);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ─────────────────────────────────────────────────────────
// Matrix helpers  (column-major, matching WebGL)
// ─────────────────────────────────────────────────────────
function mkPerspective(fovY: number, asp: number, near: number, far: number): Float32Array {
  const f  = 1.0 / Math.tan(fovY * 0.5);
  const nf = 1.0 / (near - far);
  return new Float32Array([
    f / asp, 0,  0,                      0,
    0,       f,  0,                      0,
    0,       0,  (far + near) * nf,     -1,
    0,       0,  2.0 * far * near * nf,  0,
  ]);
}

function mkLookAt(ex: number, ey: number, ez: number): Float32Array {
  /* looking at origin from (ex,ey,ez), up = (0,1,0) */
  const fl = Math.hypot(ex, ey, ez);
  const fx = -ex / fl, fy = -ey / fl, fz = -ez / fl;

  /* side = normalize(cross(forward, (0,1,0))) */
  const sl = Math.hypot(-fz, fx);
  const sx = -fz / sl, sy = 0, sz = fx / sl;

  /* up2 = cross(side, forward) */
  const ux2 = -sz * fy;
  const uy2 =  sz * fx - sx * fz;
  const uz2 =  sx * fy;

  const tx = -(sx * ex + sy * ey + sz * ez);
  const ty = -(ux2 * ex + uy2 * ey + uz2 * ez);
  const tz =  fx * ex + fy * ey + fz * ez;

  return new Float32Array([
    sx,  ux2, -fx, 0,
    sy,  uy2, -fy, 0,
    sz,  uz2, -fz, 0,
    tx,  ty,   tz, 1,
  ]);
}

function upperLeft3(m4: Float32Array): Float32Array {
  return new Float32Array([
    m4[0], m4[1], m4[2],
    m4[4], m4[5], m4[6],
    m4[8], m4[9], m4[10],
  ]);
}

// ─────────────────────────────────────────────────────────
// Sphere geometry (unit sphere, rings × sectors)
// ─────────────────────────────────────────────────────────
function buildSphere(rings: number, secs: number) {
  const pos: number[] = [], idx: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const phi = Math.PI * r / rings;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    for (let s = 0; s <= secs; s++) {
      const th = 2 * Math.PI * s / secs;
      pos.push(Math.cos(th) * sp, cp, Math.sin(th) * sp);
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < secs; s++) {
      const c = r * (secs + 1) + s;
      const n = c + secs + 1;
      idx.push(c, n, c + 1, n, n + 1, c + 1);
    }
  }
  return {
    data:  new Float32Array(pos),
    index: new Uint16Array(idx),
    count: idx.length,
  };
}

// ─────────────────────────────────────────────────────────
// One-time CSS injection for error / complete animations
// ─────────────────────────────────────────────────────────
let _css = false;
function injectCSS() {
  if (_css || typeof document === 'undefined') return;
  _css = true;
  const el = document.createElement('style');
  el.textContent = `
@keyframes blobErr{
  0%  {transform:scale(1);   opacity:1;    filter:blur(0)}
  20% {transform:scale(1.6); opacity:.85;  filter:blur(1px)}
  42% {transform:scale(3.0); opacity:.50;  filter:saturate(5) blur(7px)}
  60% {transform:scale(.10); opacity:.05;  filter:blur(12px)}
  80% {transform:scale(1.06);opacity:.75;  filter:blur(0)}
  100%{transform:scale(1);   opacity:1;    filter:blur(0)}
}
@keyframes blobVanish{
  0%  {transform:scale(1);   opacity:1}
  28% {transform:scale(1.24);opacity:.95}
  100%{transform:scale(0);   opacity:0}
}`;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export default function BlobIcon({
  size = 40,
  animate = true,
  pulse = false,
  mood = 'default',
  state = 'idle',
  streamRate = 0,
  onVanished,
}: BlobIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const propsRef  = useRef({ pulse, mood, animate, streamRate });
  propsRef.current = { pulse, mood, animate, streamRate };

  injectCSS();

  /* onVanished callback after 'complete' finishes */
  useEffect(() => {
    if (state !== 'complete' || !onVanished) return;
    const t = setTimeout(onVanished, 720);
    return () => clearTimeout(t);
  }, [state, onVanished]);

  /* WebGL setup + animation loop — re-runs only when size changes */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;

    const gl = canvas.getContext('webgl', {
      alpha: true, antialias: true, premultipliedAlpha: false,
    }) as WebGLRenderingContext | null;

    if (!gl) return; /* WebGL unavailable — canvas stays blank */

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    /* ── compile shader ── */
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('[BlobIcon] shader error:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER,   VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[BlobIcon] link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    /* ── geometry ── */
    const RINGS = 64, SECS = 64;
    const geo = buildSphere(RINGS, SECS);

    const vbuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, geo.data, gl.STATIC_DRAW);

    const ibuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.index, gl.STATIC_DRAW);

    /* ── attribute ── */
    const loc_n = gl.getAttribLocation(prog, 'a_n');
    gl.enableVertexAttribArray(loc_n);
    gl.vertexAttribPointer(loc_n, 3, gl.FLOAT, false, 0, 0);

    /* ── uniforms ── */
    const u_proj = gl.getUniformLocation(prog, 'u_proj');
    const u_mv   = gl.getUniformLocation(prog, 'u_mv');
    const u_nm   = gl.getUniformLocation(prog, 'u_nm');
    const u_t    = gl.getUniformLocation(prog, 'u_t');
    const u_amp  = gl.getUniformLocation(prog, 'u_amp');
    const u_c1   = gl.getUniformLocation(prog, 'u_c1');
    const u_c2   = gl.getUniformLocation(prog, 'u_c2');

    /* ── static matrices (camera never moves) ── */
    const proj = mkPerspective(Math.PI / 4, 1.0, 0.1, 20.0);
    const mv   = mkLookAt(0, 0, 3);
    const nm   = upperLeft3(mv);
    gl.uniformMatrix4fv(u_proj, false, proj);
    gl.uniformMatrix4fv(u_mv,   false, mv);
    gl.uniformMatrix3fv(u_nm,   false, nm);

    /* ── render loop ── */
    let startTs: number | null = null;

    const frame = (ts: number) => {
      if (startTs === null) startTs = ts;
      const sec = (ts - startTs) * 0.001;

      const { pulse: p, mood: m, streamRate: sr } = propsRef.current;
      const pal = PAL[m] || PAL.default;

      /* speed and amplitude: pulse + live streaming rate both drive them */
      const speed = 1.0 + (p ? 1.40 : 0) + sr * 1.20;
      const amp   = 0.24 + (p ? 0.09 : 0) + sr * 0.09;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.uniform1f(u_t,   sec * speed);
      gl.uniform1f(u_amp, amp);
      gl.uniform3fv(u_c1, new Float32Array(pal.c1));
      gl.uniform3fv(u_c2, new Float32Array(pal.c2));

      gl.drawElements(gl.TRIANGLES, geo.count, gl.UNSIGNED_SHORT, 0);

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      gl.deleteBuffer(vbuf);
      gl.deleteBuffer(ibuf);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(prog);
    };
  }, [size]);

  /* glow color from mood palette */
  const pal        = PAL[mood] || PAL.default;
  const glowAlpha  = pulse ? 0.80 : 0.55;
  const glowRadius = Math.round(size * 0.20);
  const glowColor  = `rgba(${pal.gr[0]},${pal.gr[1]},${pal.gr[2]},${glowAlpha})`;

  const wrapAnim =
    state === 'error'    ? 'blobErr 1.40s cubic-bezier(.4,0,.2,1) forwards'
    : state === 'complete' ? 'blobVanish .72s ease-in forwards'
    : 'none';

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
        animation: wrapAnim,
        filter: `drop-shadow(0 0 ${glowRadius}px ${glowColor})`,
        willChange: 'transform, opacity, filter',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </span>
  );
}
