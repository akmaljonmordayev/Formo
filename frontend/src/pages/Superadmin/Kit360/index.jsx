import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { BACK_FRAMES, printLayout } from './measure';

/* Forma 360°: har jamoa uchun 8 ta burchak (45° qadam), mijoz ismi va raqami yozilishi bilan formada chiziladi.
   Bosma joyi har bir suratdan o'lchanadi (measure.js) — kadrlar neyroset chizgani uchun har biri biroz boshqacha. */
const FRAMES = import.meta.glob('./frames/*/*.jpg', { eager: true, query: '?url', import: 'default' });
const frameUrl = (id, i) => FRAMES[`./frames/${id}/f${i}.jpg`];
const N = 8;
const W = 600;
const H = 800;

// ink — yozuv rangi, shortsInk — shortikdagi (shortik rangi boshqa bo'lsa), outline — klub uslubidagi kontur
export const TEAMS = [
  { id: 'es', name: 'Ispaniya', ink: '#f6c23e' },
  { id: 'ar', name: 'Argentina', ink: '#111318', shortsInk: '#ffffff' },
  { id: 'fr', name: 'Fransiya', ink: '#ffffff', shortsInk: '#1f2a5c' },
  { id: 'en', name: 'Angliya', ink: '#1b2450', shortsInk: '#ffffff' },
  { id: 'pt', name: 'Portugaliya', ink: '#f3c74a' },
  { id: 'rm', name: 'Real Madrid', ink: '#1b2450', outline: '#c9a13b' },
  { id: 'fcb', name: 'Barselona', ink: '#f2c12e' },
  { id: 'mu', name: 'Manchester Yunayted', ink: '#ffffff', shortsInk: '#111318' },
  { id: 'psg', name: 'PSJ', ink: '#ffffff', outline: '#d6202f' },
  { id: 'mci', name: 'Manchester Siti', ink: '#1b2450' },
];

// Bosma shriftlari: Google Fonts dan kerak bo'lganda yuklanadi; weight — shriftning haqiqiy qalinligi (soxta bold bo'lmasin)
export const FONTS = [
  { id: 'sport', label: 'Sport', family: '"Saira Extra Condensed"', weight: 800 },
  { id: 'classic', label: 'Klassik', family: 'Oswald', weight: 700 },
  { id: 'bebas', label: 'Bebas', family: '"Bebas Neue"', weight: 400 },
  { id: 'modern', label: 'Modern', family: 'Teko', weight: 600 },
  { id: 'college', label: 'Kollej', family: 'Graduate', weight: 400 },
  { id: 'wide', label: 'Keng', family: '"Russo One"', weight: 400 },
];
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Bebas+Neue&family=Teko:wght@600&family=Graduate&family=Russo+One&display=swap';
const fontCss = (f, size) => `${f.weight} ${size}px ${f.family}, "Arial Narrow", sans-serif`;

export const cleanName = (s) => s.toUpperCase().replace(/[^A-ZА-ЯЁЎҚҒҲ'‘’ʻ .-]/g, '').slice(0, 12);
export const cleanNumber = (s) => s.replace(/\D/g, '').replace(/^0+/, '').slice(0, 2);

// Tana sirti (ellips) bo'ylab yoy uzunligi (px) → burchak t; t = 0 — orqa markazi
function arcTable({ a, b }) {
  const n = 256;
  const ts = [];
  const ss = [];
  let s = 0;
  for (let i = 0; i <= n; i += 1) {
    const t = -Math.PI / 2 + (Math.PI * i) / n;
    if (i) s += Math.hypot(a * Math.cos(t), b * Math.sin(t)) * (Math.PI / n);
    ts.push(t);
    ss.push(s);
  }
  const mid = ss[n / 2];
  return { ts, ss: ss.map((v) => v - mid) };
}
function angleAt({ ts, ss }, s) {
  let lo = 0;
  let hi = ss.length - 1;
  if (s <= ss[lo]) return ts[lo];
  if (s >= ss[hi]) return ts[hi];
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (ss[m] < s) lo = m; else hi = m;
  }
  return ts[lo] + ((s - ss[lo]) / (ss[hi] - ss[lo])) * (ts[hi] - ts[lo]);
}
const surfaceX = ({ mid, a, b, theta }, t) => mid + a * Math.sin(t) * Math.cos(theta) + b * Math.cos(t) * Math.sin(theta);
const facesCamera = ({ a, b, theta }, t) => b * Math.cos(t) * Math.cos(theta) - a * Math.sin(t) * Math.sin(theta) > 0;

// Matnni alohida qatlamga chizamiz: tanlangan shrift, harflar orasi, ixtiyoriy kontur va yumshoq chet — bosma kabi.
// Balandlik — bosh harflar balandligi (size), shrift qanday bo'lishidan qat'i nazar
function textLayer(text, z, style, color, outline) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  const setFont = (px) => {
    x.font = fontCss(style.font, px);
    if ('letterSpacing' in x) x.letterSpacing = `${z.track}px`;
  };
  let target = z.size * style.scale;
  setFont(100);
  const capRatio = x.measureText('H0').actualBoundingBoxAscent / 100 || 0.72;
  let px = target / capRatio;
  setFont(px);
  const w = x.measureText(text).width;
  if (z.maxW && w > z.maxW * style.scale) {
    px *= (z.maxW * style.scale) / w;
    target = px * capRatio;
  }
  const stroke = outline ? Math.max(1, target * 0.045) : 0;
  setFont(px);
  const pad = Math.ceil(stroke) + 3;
  c.width = Math.ceil(x.measureText(text).width) + pad * 2;
  c.height = Math.ceil(target) + pad * 2;
  setFont(px); // o'lcham o'zgarganda kontekst holati tozalanadi
  x.filter = 'blur(0.35px)';
  x.lineJoin = 'round';
  const baseline = c.height - pad;
  if (outline) {
    x.strokeStyle = outline;
    x.lineWidth = stroke * 2;
    x.strokeText(text, pad, baseline);
  }
  x.fillStyle = color;
  x.fillText(text, pad, baseline);
  c.pad = pad;
  return c;
}

// Suratning piksellari — faqat o'lchash uchun, natija (joylashuv) kadr bo'yicha keshlanadi
function pixels(img) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  return x.getImageData(0, 0, W, H);
}
const layouts = new WeakMap();
function layoutFor(frame, img, backImg) {
  if (!layouts.has(img)) {
    const back = frame !== 4 && backImg?.complete && backImg.naturalWidth ? pixels(backImg) : null;
    layouts.set(img, printLayout(frame, pixels(img), back));
  }
  return layouts.get(img);
}

let scratch;
function paint(canvas, img, frame, { name, number, team, style }, backImg) {
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  if (!name && !number) return;
  scratch = scratch || Object.assign(document.createElement('canvas'), { width: W, height: H });
  const s = scratch.getContext('2d');
  for (const z of layoutFor(frame, img, backImg)) {
    const text = z.text === 'name' ? name : number;
    if (!text) continue;
    // Shortikda klub rangi saqlanadi, agar admin raqam rangini o'zgartirmagan bo'lsa (shortik boshqa rangda)
    const color = z.text === 'name' ? style.nameColor
      : z.shorts && style.numberColor === team.ink && team.shortsInk ? team.shortsInk : style.numberColor;
    const layer = textLayer(text, z, style, color, z.shorts ? null : team.outline);
    const top = z.y - (layer.height - layer.pad);
    s.clearRect(0, 0, W, H);
    let x0 = W;
    let x1 = 0;
    if (z.shorts) {
      x0 = z.cx - layer.width / 2;
      x1 = x0 + layer.width;
      s.drawImage(layer, x0, top);
    } else {
      // Har ustun sirtdagi o'z joyiga: orqa markazida to'g'ri, chetlarga va burilishga qarab siqiladi
      const arc = arcTable(z.surface);
      for (let i = 0; i < layer.width; i += 1) {
        const ta = angleAt(arc, i - layer.width / 2);
        if (!facesCamera(z.surface, ta)) continue;
        const l = surfaceX(z.surface, ta);
        const r = surfaceX(z.surface, angleAt(arc, i + 1 - layer.width / 2));
        if (r <= l) continue;
        s.drawImage(layer, i, 0, 1, layer.height, l, top, r - l + 1, layer.height); // +1 — ustunlar orasida tirqish qolmasin
        x0 = Math.min(x0, l);
        x1 = Math.max(x1, r);
      }
    }
    if (x1 <= x0) continue;
    const m = MAX_SHIFT + 2;
    shadeInto(ctx, s, Math.floor(x0) - m, Math.floor(top) - m, Math.ceil(x1 - x0) + m * 2, layer.height + m * 2);
  }
}

/* Matoga "yopishtirish":
   - burma: harflar mato relyefi bo'ylab siljiydi (Photoshop'dagi Displace kabi) — yorqinlik gradientiga qarab, MAX_SHIFT px gacha;
   - soya: yorqinlik atrofdagi (SHADE_R px) o'rtachaga nisbatan — mato rangi emas, faqat soya va burmalar ta'sir qiladi;
   - plyonka: burmalarning yorug' joyida ozgina yaltirash va mayda don. */
const SHADE_R = 9;
const BEND_R = 4;
const MAX_SHIFT = 3;
function shadeInto(ctx, s, x, y, w, h) {
  const base = ctx.getImageData(x, y, w, h);
  const ink = s.getImageData(x, y, w, h).data;
  const b = base.data;
  const L = new Float32Array(w * h);
  for (let p = 0; p < w * h; p += 1) L[p] = 0.299 * b[p * 4] + 0.587 * b[p * 4 + 1] + 0.114 * b[p * 4 + 2];
  // integral tasvir — har nuqta atrofidagi o'rtachani tez hisoblash uchun
  const I = new Float64Array((w + 1) * (h + 1));
  for (let r = 0; r < h; r += 1) {
    let row = 0;
    for (let c = 0; c < w; c += 1) {
      row += L[r * w + c];
      I[(r + 1) * (w + 1) + c + 1] = I[r * (w + 1) + c + 1] + row;
    }
  }
  const mean = (c, r, R) => {
    const c0 = Math.max(0, c - R);
    const c1 = Math.min(w, c + R + 1);
    const r0 = Math.max(0, r - R);
    const r1 = Math.min(h, r + R + 1);
    const sum = I[r1 * (w + 1) + c1] - I[r0 * (w + 1) + c1] - I[r1 * (w + 1) + c0] + I[r0 * (w + 1) + c0];
    return sum / ((c1 - c0) * (r1 - r0)) || 1;
  };
  const clampShift = (v) => Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, v));
  // Siljigan joydagi bosma pikseli (bilinear)
  const sample = (fx, fy, ch) => {
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    if (x0 < 0 || y0 < 0 || x0 + 1 >= w || y0 + 1 >= h) return 0;
    const ax = fx - x0;
    const ay = fy - y0;
    const at = (xx, yy) => ink[(yy * w + xx) * 4 + ch];
    return (at(x0, y0) * (1 - ax) + at(x0 + 1, y0) * ax) * (1 - ay) + (at(x0, y0 + 1) * (1 - ax) + at(x0 + 1, y0 + 1) * ax) * ay;
  };
  for (let r = 1; r < h - 1; r += 1) {
    for (let c = 1; c < w - 1; c += 1) {
      const gx = (mean(c + 1, r, BEND_R) - mean(c - 1, r, BEND_R)) / 2;
      const gy = (mean(c, r + 1, BEND_R) - mean(c, r - 1, BEND_R)) / 2;
      const fx = c - clampShift(gx * 0.35);
      const fy = r - clampShift(gy * 0.35);
      const alpha = (sample(fx, fy, 3) / 255) * 0.95;
      if (alpha < 0.004) continue;
      const p = r * w + c;
      const rel = L[p] / mean(c, r, SHADE_R);
      const shade = Math.min(1.12, Math.max(0.7, rel));
      const sheen = Math.max(0, rel - 1) * 110;
      const grain = (((p * 2654435761) >>> 0) % 9) - 4;
      for (let ch = 0; ch < 3; ch += 1) {
        const printed = sample(fx, fy, ch) * shade * 0.94 + b[p * 4 + ch] * 0.06 + sheen + grain;
        b[p * 4 + ch] = b[p * 4 + ch] * (1 - alpha) + printed * alpha;
      }
    }
  }
  ctx.putImageData(base, x, y);
}

const defaultStyle = (team, font = FONTS[0], scale = 1) => ({ font, scale, nameColor: team.ink, numberColor: team.ink });

export default function Kit360() {
  const t = useT();
  const canvasRef = useRef(null);
  const cache = useRef({});
  const drag = useRef(null);
  const [team, setTeam] = useState(TEAMS[5]);
  const [frame, setFrame] = useState(0);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [style, setStyle] = useState(() => defaultStyle(TEAMS[5]));
  const [, setLoaded] = useState(0);

  const image = (id, i) => {
    const key = `${id}/${i}`;
    if (!cache.current[key]) {
      const im = new Image();
      im.onload = () => setLoaded((n) => n + 1);
      im.src = frameUrl(id, i);
      cache.current[key] = im;
    }
    return cache.current[key];
  };

  // Tanlangan jamoaning barcha burchaklari oldindan yuklanadi — aylantirganda kutish bo'lmaydi
  useEffect(() => {
    for (let i = 0; i < N; i += 1) image(team.id, i);
  }, [team.id]);

  // Bosma shriftlari bir marta ulanadi; yuklangach qayta chiziladi
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONTS_CSS}"]`)) {
      document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS_CSS }));
    }
  }, []);
  useEffect(() => {
    document.fonts?.load(fontCss(style.font, 40), 'ISROIL 10').then(() => setLoaded((n) => n + 1)).catch(() => {});
  }, [style.font]);

  useEffect(() => {
    const img = image(team.id, frame);
    const back = image(team.id, 4);
    // Burilgan kadr joylashuvi 180° kadridan olinadi va keshlanadi — u yuklanmaguncha chizmaymiz
    if (img.complete && img.naturalWidth && back.complete) paint(canvasRef.current, img, frame, { name, number, team, style }, back);
  });

  // Ism yoki raqam yozilsa — forma orqasiga buriladi
  const showBack = () => setFrame((f) => (f in BACK_FRAMES ? f : 4));
  const turn = (step) => setFrame((f) => (f + step + N) % N);
  const pickTeam = (tm) => {
    setTeam(tm);
    setStyle((st) => defaultStyle(tm, st.font, st.scale));
  };

  const onPointerDown = (e) => {
    drag.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (drag.current === null) return;
    const dx = e.clientX - drag.current;
    if (Math.abs(dx) >= 40) {
      turn(dx < 0 ? 1 : -1);
      drag.current = e.clientX;
    }
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') turn(1);
    if (e.key === 'ArrowRight') turn(-1);
  };

  const views = [
    { label: 'Old', frame: 0 },
    { label: 'Yon', frame: 2 },
    { label: 'Orqa', frame: 4 },
  ];
  const field = { display: 'flex', flexDirection: 'column', gap: 6 };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Forma 360°')}</h1>
          <p>{t("Mijoz ismi va raqamini yozsa, ular forma orqasida darhol ko'rinadi")}</p>
        </div>
      </div>

      <div className="sa-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          tabIndex={0}
          aria-label={t('{team} formasi, {deg}°. Strelkalar bilan aylantiring', { team: t(team.name), deg: frame * 45 })}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
          onKeyDown={onKeyDown}
          style={{
            width: '100%', maxWidth: 360, aspectRatio: '3 / 4', borderRadius: 12, background: '#b2b2b3',
            touchAction: 'pan-y', cursor: 'grab', flex: '0 1 360px',
          }}
        />

        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="sa-table__sub" style={{ marginBottom: 8 }}>{t('Jamoa')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TEAMS.map((tm) => (
                <button
                  key={tm.id}
                  type="button"
                  className={tm.id === team.id ? 'sa-btn' : 'sa-btn sa-btn--ghost'}
                  aria-pressed={tm.id === team.id}
                  onClick={() => pickTeam(tm)}
                >
                  {t(tm.name)}
                </button>
              ))}
            </div>
          </div>

          <label style={field}>
            <span className="sa-table__sub">{t('Ism')}</span>
            <input
              className="sa-input"
              value={name}
              maxLength={12}
              placeholder="ISROIL"
              onChange={(e) => { setName(cleanName(e.target.value)); showBack(); }}
            />
          </label>
          <label style={field}>
            <span className="sa-table__sub">{t('Raqam')}</span>
            <input
              className="sa-input"
              value={number}
              inputMode="numeric"
              placeholder="10"
              onChange={(e) => { setNumber(cleanNumber(e.target.value)); showBack(); }}
            />
          </label>

          <div>
            <div className="sa-table__sub" style={{ marginBottom: 8 }}>{t('Shrift')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={f.id === style.font.id ? 'sa-btn' : 'sa-btn sa-btn--ghost'}
                  aria-pressed={f.id === style.font.id}
                  onClick={() => { setStyle((st) => ({ ...st, font: f })); showBack(); }}
                  style={{ fontFamily: f.family, fontWeight: f.weight, letterSpacing: '0.04em' }}
                >
                  {t(f.label)} 10
                </button>
              ))}
            </div>
          </div>

          <label style={field}>
            <span className="sa-table__sub">{t("O'lcham")}: {Math.round(style.scale * 100)}%</span>
            <input
              type="range"
              min={80}
              max={120}
              step={5}
              value={Math.round(style.scale * 100)}
              onChange={(e) => { setStyle((st) => ({ ...st, scale: Number(e.target.value) / 100 })); showBack(); }}
            />
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <label style={{ ...field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={style.nameColor}
                onChange={(e) => { setStyle((st) => ({ ...st, nameColor: e.target.value })); showBack(); }}
              />
              <span className="sa-table__sub">{t('Ism rangi')}</span>
            </label>
            <label style={{ ...field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={style.numberColor}
                onChange={(e) => { setStyle((st) => ({ ...st, numberColor: e.target.value })); showBack(); }}
              />
              <span className="sa-table__sub">{t('Raqam rangi')}</span>
            </label>
            <button
              type="button"
              className="sa-btn sa-btn--ghost"
              onClick={() => setStyle((st) => defaultStyle(team, st.font, st.scale))}
            >
              {t('Klub ranglari')}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {views.map((v) => (
              <button
                key={v.frame}
                type="button"
                className={frame === v.frame ? 'sa-btn' : 'sa-btn sa-btn--ghost'}
                aria-pressed={frame === v.frame}
                onClick={() => setFrame(v.frame)}
              >
                {t(v.label)}
              </button>
            ))}
          </div>
          <div className="sa-table__sub">
            {frame * 45}° · {t("Suratni sudrab aylantiring. Ism va raqam orqa tomondan (135°–225°), raqam shortikda — oldidan ko'rinadi")}
          </div>
        </div>
      </div>
    </>
  );
}
