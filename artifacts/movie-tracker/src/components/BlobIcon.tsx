// @ts-nocheck
import React, { useRef, useEffect } from 'react';

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

// Each mood: rgb for glow math + gradient stops for fold lighting
const MOODS: Record<string, {
  gr: number; gg: number; gb: number;   // glow RGB
  stops: string[];                       // base radial gradient 5 stops
  hi: string[];                          // fold highlight rgba colors
}> = {
  default:  { gr:136, gg:0,   gb:220,
    stops:['#FF55FF','#CC00CC','#8800BB','#340060','#080018'],
    hi:['rgba(255,140,255,.74)','rgba(220,60,255,.58)','rgba(160,20,220,.62)','rgba(180,0,220,.52)'] },
  horror:   { gr:200, gg:0,   gb:0,
    stops:['#FF5533','#CC0000','#880000','#300000','#080000'],
    hi:['rgba(255,140,100,.74)','rgba(220,30,0,.58)','rgba(160,0,0,.62)','rgba(180,0,0,.52)'] },
  romance:  { gr:220, gg:0,   gb:100,
    stops:['#FF88CC','#FF1493','#990055','#330018','#080005'],
    hi:['rgba(255,160,220,.74)','rgba(220,30,120,.58)','rgba(160,0,80,.62)','rgba(180,0,100,.52)'] },
  scifi:    { gr:0,   gg:170, gb:220,
    stops:['#44FFFF','#00AADD','#006699','#002233','#000608'],
    hi:['rgba(100,255,255,.74)','rgba(0,200,240,.58)','rgba(0,130,180,.62)','rgba(0,150,200,.52)'] },
  action:   { gr:220, gg:80,  gb:0,
    stops:['#FFAA44','#FF5500','#882200','#280A00','#060200'],
    hi:['rgba(255,180,80,.74)','rgba(220,100,0,.58)','rgba(160,50,0,.62)','rgba(180,60,0,.52)'] },
  comedy:   { gr:220, gg:170, gb:0,
    stops:['#FFEE55','#FFBB00','#886600','#282000','#060500'],
    hi:['rgba(255,240,120,.74)','rgba(220,190,0,.58)','rgba(160,130,0,.62)','rgba(180,140,0,.52)'] },
  drama:    { gr:50,  gg:100, gb:200,
    stops:['#6699FF','#1155CC','#103377','#001028','#000308'],
    hi:['rgba(120,160,255,.74)','rgba(50,100,220,.58)','rgba(20,60,160,.62)','rgba(30,70,180,.52)'] },
  fantasy:  { gr:130, gg:40,  gb:200,
    stops:['#DD99FF','#9933CC','#551188','#180028','#050008'],
    hi:['rgba(220,160,255,.74)','rgba(180,60,240,.58)','rgba(120,20,180,.62)','rgba(140,0,200,.52)'] },
  thriller: { gr:50,  gg:80,  gb:120,
    stops:['#7799BB','#334466','#1A2233','#090D11','#020305'],
    hi:['rgba(130,160,200,.74)','rgba(70,100,150,.58)','rgba(40,60,100,.62)','rgba(50,70,110,.52)'] },
  animation:{ gr:220, gg:40,  gb:130,
    stops:['#FF99EE','#FF44AA','#881155','#280018','#060005'],
    hi:['rgba(255,160,240,.74)','rgba(220,60,170,.58)','rgba(160,20,110,.62)','rgba(180,0,130,.52)'] },
  documentary:{gr:30, gg:150, gb:70,
    stops:['#77DDAA','#22AA55','#116633','#042218','#010805'],
    hi:['rgba(120,220,170,.74)','rgba(40,180,90,.58)','rgba(10,130,60,.62)','rgba(20,150,70,.52)'] },
  mystery:  { gr:60,  gg:100, gb:150,
    stops:['#99BBDD','#446688','#223344','#091218','#020405'],
    hi:['rgba(150,190,220,.74)','rgba(80,120,180,.58)','rgba(40,80,130,.62)','rgba(50,90,150,.52)'] },
  western:  { gr:160, gg:120, gb:0,
    stops:['#DDBB44','#AA8800','#665500','#221A00','#060400'],
    hi:['rgba(220,190,80,.74)','rgba(180,150,0,.58)','rgba(130,100,0,.62)','rgba(150,110,0,.52)'] },
  war:      { gr:60,  gg:80,  gb:100,
    stops:['#99AABB','#445566','#222D33','#090D10','#020303'],
    hi:['rgba(150,170,190,.74)','rgba(80,110,140,.58)','rgba(50,70,90,.62)','rgba(60,80,100,.52)'] },
  music:    { gr:100, gg:20,  gb:200,
    stops:['#CC88FF','#7722CC','#440088','#160028','#050008'],
    hi:['rgba(200,150,255,.74)','rgba(150,50,230,.58)','rgba(100,10,170,.62)','rgba(120,0,190,.52)'] },
  adventure:{ gr:30,  gg:150, gb:110,
    stops:['#55DDBB','#22AA77','#116644','#042218','#010806'],
    hi:['rgba(100,220,190,.74)','rgba(40,180,130,.58)','rgba(10,130,90,.62)','rgba(20,150,100,.52)'] },
  crime:    { gr:160, gg:70,  gb:0,
    stops:['#DDAA55','#AA5500','#662200','#200A00','#060200'],
    hi:['rgba(220,170,80,.74)','rgba(180,100,0,.58)','rgba(130,50,0,.62)','rgba(150,60,0,.52)'] },
  history:  { gr:150, gg:110, gb:40,
    stops:['#DDBB88','#AA8844','#664422','#200E08','#060300'],
    hi:['rgba(220,190,140,.74)','rgba(180,150,70,.58)','rgba(130,90,30,.62)','rgba(150,100,40,.52)'] },
};

let _stylesInjected = false;
function injectStyles() {
  if (_stylesInjected || typeof document === 'undefined') return;
  _stylesInjected = true;
  const el = document.createElement('style');
  el.textContent = `
@keyframes blobErrWrap{
  0%{transform:scale(1);opacity:1;filter:blur(0px)}
  20%{transform:scale(1.5);opacity:.85;filter:blur(1px)}
  40%{transform:scale(2.8);opacity:.55;filter:saturate(4) blur(5px)}
  58%{transform:scale(4);opacity:.2;filter:saturate(6) blur(18px)}
  72%{transform:scale(.1);opacity:.05;filter:blur(10px)}
  86%{transform:scale(1.08);opacity:.72;filter:blur(0px)}
  100%{transform:scale(1);opacity:1;filter:blur(0px)}
}
@keyframes blobVanishWrap{
  0%{transform:scale(1);opacity:1}
  28%{transform:scale(1.28);opacity:.95}
  62%{transform:scale(.85);opacity:.4}
  100%{transform:scale(0);opacity:0}
}
`;
  document.head.appendChild(el);
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

export default function BlobIcon({
  size = 40, animate = true, pulse = false,
  mood = 'default', state = 'idle', onVanished,
}: BlobIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const propsRef  = useRef({ pulse, mood, animate });
  propsRef.current = { pulse, mood, animate };

  injectStyles();

  useEffect(() => {
    if (state !== 'complete' || !onVanished) return;
    const t = setTimeout(onVanished, 700);
    return () => clearTimeout(t);
  }, [state, onVanished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const W = size, H = size, cx = W / 2, cy = H / 2;
    let startTs: number | null = null;

    const frame = (ts: number) => {
      if (startTs === null) startTs = ts;
      const sec = (ts - startTs) * 0.001;
      const { pulse: p, mood: m } = propsRef.current;
      const pal = MOODS[m] || MOODS.default;
      const spd = p ? 2.4 : 1.0;
      const t   = sec * spd;

      ctx.clearRect(0, 0, W, H);

      // ── OUTER GLOW ──
      const glowPulse = 0.30 + 0.16 * Math.sin(sec * (p ? 4.5 : 1.8));
      const glowR = W * (p ? 0.60 : 0.50);
      const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      gg.addColorStop(0,    rgba(pal.gr, pal.gg, pal.gb, glowPulse * 1.4));
      gg.addColorStop(0.45, rgba(pal.gr, pal.gg, pal.gb, glowPulse));
      gg.addColorStop(1,    rgba(pal.gr, pal.gg, pal.gb, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, W, H);

      // ── BLOB SHAPE (20 control points, 6 harmonics each) ──
      const N = 20;
      const baseR = W * 0.38;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI * 0.5;
        const r = baseR * (1
          + 0.155 * Math.sin(t * 0.63 + a * 2.1  + 0.30)
          + 0.105 * Math.sin(t * 1.27 + a * 3.7  + 1.10)
          + 0.075 * Math.sin(t * 0.44 + a * 1.8  + 2.20)
          + 0.055 * Math.cos(t * 1.83 + a * 4.5  + 0.80)
          + 0.040 * Math.sin(t * 0.27 + a * 5.3  + 1.50)
          + 0.030 * Math.cos(t * 2.35 + a * 6.2  + 2.70)
        );
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }

      // Smooth closed curve through midpoints (Catmull–Rom approximation)
      ctx.beginPath();
      const m0x = (pts[N - 1].x + pts[0].x) / 2;
      const m0y = (pts[N - 1].y + pts[0].y) / 2;
      ctx.moveTo(m0x, m0y);
      for (let i = 0; i < N; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % N];
        ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      }
      ctx.closePath();

      // Clip everything that follows to the blob shape
      ctx.save();
      ctx.clip();

      // ── HELPER: paint a radial gradient patch (blended over entire clip area) ──
      const patch = (px: number, py: number, r: number, color: string, alpha = 1.0) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      };

      // ── BASE GRADIENT ──
      // Focus point slowly drifts (simulates light source shift over silk)
      const bx = cx + W * 0.10 * Math.sin(t * 0.28);
      const by = cy - H * 0.08 * Math.cos(t * 0.35);
      const bg = ctx.createRadialGradient(bx, by - H * 0.13, W * 0.01, cx, cy, W * 0.54);
      bg.addColorStop(0,    pal.stops[0]);
      bg.addColorStop(0.26, pal.stops[1]);
      bg.addColorStop(0.54, pal.stops[2]);
      bg.addColorStop(0.80, pal.stops[3]);
      bg.addColorStop(1,    pal.stops[4]);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── FOLD HIGHLIGHTS (4 animated bright patches = lit silk folds) ──
      patch(cx+W*.18+W*.04*Math.sin(t*.50+0.0), cy-H*.17+H*.03*Math.cos(t*.42+0.0), W*.33, pal.hi[0]);
      patch(cx-W*.06+W*.05*Math.sin(t*.60+1.1), cy-H*.21+H*.04*Math.cos(t*.70+0.5), W*.25, pal.hi[1]);
      patch(cx-W*.20+W*.05*Math.sin(t*.45+2.2), cy+H*.03+H*.03*Math.sin(t*.52+1.2), W*.25, pal.hi[2]);
      patch(cx+W*.17+W*.03*Math.sin(t*.55+3.3), cy+H*.20+H*.04*Math.sin(t*.48+2.1), W*.23, pal.hi[3]);

      // ── SHADOW VALLEYS (dark creases between folds) ──
      patch(cx-W*.20, cy+H*.22+H*.03*Math.sin(t*.50+4.0), W*.34, 'rgba(0,0,0,.76)');
      patch(cx+W*.04, cy+H*.07+H*.02*Math.cos(t*.58+1.0), W*.19, 'rgba(0,0,0,.62)');
      patch(cx-W*.17, cy-H*.16+H*.03*Math.cos(t*.42+1.5), W*.23, 'rgba(0,0,0,.50)');
      patch(cx+W*.11, cy-H*.04+H*.02*Math.sin(t*.65+2.5), W*.13, 'rgba(0,0,0,.38)');

      // ── EDGE VIGNETTE (darkens the blob rim → makes it look round and 3D) ──
      const vg = ctx.createRadialGradient(cx, cy, W * 0.24, cx, cy, W * 0.54);
      vg.addColorStop(0,   'transparent');
      vg.addColorStop(0.65,'transparent');
      vg.addColorStop(1,   'rgba(0,0,0,.92)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      // ── SPECULAR HIGHLIGHTS (shiny silk sheen) ──
      patch(cx+W*.17+W*.02*Math.sin(t*.33), cy-H*.19+H*.02*Math.cos(t*.38), W*.095, 'rgba(255,255,255,.90)');
      patch(cx+W*.24+W*.01*Math.sin(t*.45), cy-H*.03+H*.01*Math.cos(t*.50), W*.065, 'rgba(255,255,255,.58)');

      // Silver fold-edge accents (thin bright slivers where folds meet)
      patch(cx-W*.10+W*.02*Math.sin(t*.40), cy+H*.26, W*.075, 'rgba(200,170,255,.60)', 0.7);
      patch(cx+W*.26, cy+H*.13+H*.02*Math.sin(t*.44), W*.055, 'rgba(200,180,255,.55)', 0.6);

      ctx.restore();

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  const wrapAnim =
    state === 'error'    ? 'blobErrWrap 1.35s cubic-bezier(.4,0,.2,1) forwards'
    : state === 'complete' ? 'blobVanishWrap .72s ease-in forwards'
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
        willChange: 'transform, opacity, filter',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </span>
  );
}
