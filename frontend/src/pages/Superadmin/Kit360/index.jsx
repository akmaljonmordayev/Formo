import { useCallback, useEffect, useState, useRef } from 'react';
import { useT } from '../i18n';
import { DEFAULT_ORDER_RULES, SETTING_KEYS, loadSettings } from '../adminApi';
import { BACK_FRAMES, CROP, FRONT_FRAMES, garmentMask, healedPixels, printLayout, projectedHalf } from './measure';

/* Forma 360°: har jamoa uchun 8 ta burchak (45° qadam), mijoz ismi va raqami yozilishi bilan formada chiziladi.
   Bosma joyi har bir suratdan o'lchanadi (measure.js) — kadrlar neyroset chizgani uchun har biri biroz boshqacha. */
const FRAMES = import.meta.glob('./frames/*/*.jpg', { eager: true, query: '?url', import: 'default' });
const frameUrl = (id, i) => FRAMES[`./frames/${id}/f${i}.jpg`];
const N = 8;
// Ekrandagi mantiqiy o'lcham (3:4); bufer — W×dpr, kadrdan CROP qismi cho'ziladi
const W = 600;
const H = 800;

// Har klub/terma jamoaga bitta forma. kind — tanlash tugmalari guruhi; ink — yozuv rangi, shortsInk — shortikdagi
// (shortik rangi boshqa bo'lsa), outline — klub uslubidagi kontur
export const TEAMS = [
  { id: 'es', kind: 'national', name: 'Ispaniya', ink: '#f6c23e' },
  { id: 'ar', kind: 'national', name: 'Argentina', ink: '#111318', shortsInk: '#ffffff' },
  { id: 'fr', kind: 'national', name: 'Fransiya', ink: '#ffffff', shortsInk: '#1f2a5c' },
  { id: 'en', kind: 'national', name: 'Angliya', ink: '#1b2450', shortsInk: '#ffffff' },
  { id: 'pt', kind: 'national', name: 'Portugaliya', ink: '#f3c74a' },
  { id: 'rm', kind: 'club', name: 'Real Madrid', ink: '#1b2450', outline: '#c9a13b' },
  { id: 'fcb', kind: 'club', name: 'Barselona', ink: '#f2c12e' },
  { id: 'mu', kind: 'club', name: 'Manchester Yunayted', ink: '#ffffff', shortsInk: '#111318' },
  { id: 'psg', kind: 'club', name: 'PSJ', ink: '#ffffff', outline: '#d6202f' },
  { id: 'mci', kind: 'club', name: 'Manchester Siti', ink: '#1b2450' },
];

/* Bosma shriftlari — har biri lotin, kirill va o'zbek kirill (Ў Қ Ғ Ҳ) harflariga ega (Google Fonts: cyrillic-ext).
   Kollej shriftida cyrillic-ext yo'q — Қ Ғ Ҳ uning o'z oilasidagi Alumni Sans dan olinadi; oxirgi zaxira — Oswald, Arial emas.
   weight — shriftning yuklangan haqiqiy qalinligi (soxta bold bo'lmasin). */
export const FONTS = [
  { id: 'sport', label: 'Sport', family: '"Sofia Sans Extra Condensed"', weight: 800 },
  { id: 'classic', label: 'Klassik', family: 'Oswald', weight: 700 },
  { id: 'athletic', label: 'Atletik', family: '"Alumni Sans"', weight: 800 },
  { id: 'modern', label: 'Modern', family: 'Tektur', weight: 700 },
  { id: 'college', label: 'Kollej', family: '"Alumni Sans Collegiate One"', weight: 400, companion: '"Alumni Sans"' },
  { id: 'wide', label: 'Keng', family: 'Unbounded', weight: 700 },
];
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:wght@800&family=Oswald:wght@700'
  + '&family=Alumni+Sans:wght@800&family=Tektur:wght@700&family=Alumni+Sans+Collegiate+One&family=Unbounded:wght@700&display=swap';
const FONT_SAMPLE = 'ISROIL ИСРОИЛ ЎҚҒҲ 10';
export const fontCss = (f, size) => `${f.weight} ${size}px ${[f.family, f.companion, 'Oswald'].filter(Boolean).join(', ')}, sans-serif`;

// Klaviaturadagi barcha apostrof turlari (` ' ‘ ’ ʻ ʼ ´) bitta ' ga — O'KTAM, G'OFUR har qanday klaviaturada bir xil
const APOSTROPHES = /[`'‘’ʻʼ´]/g;
export const cleanName = (s, maxLen = DEFAULT_ORDER_RULES.printNameMaxLength) => s
  .replace(APOSTROPHES, "'")
  .toUpperCase()
  .replace(/[^A-ZА-ЯЁЎҚҒҲ' .-]/g, '')
  .replace(/ {2,}/g, ' ')
  .replace(/^ /, '')
  .slice(0, maxLen);
// Formaga chiqadigan matn: chetdagi va qo'sh bo'shliqlarsiz (" ALI" umurtqa ustida markazda tursin)
export const printText = (s) => s.trim().replace(/\s+/g, ' ');

// Raqam: faqat raqamlar, oldidagi nollar (bitta "0" dan tashqari) olib tashlanadi, [min, max] oralig'idan chiqmaydi
export function cleanNumber(s, _min = DEFAULT_ORDER_RULES.printNumberMin, max = DEFAULT_ORDER_RULES.printNumberMax) {
  let v = s.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, String(Math.max(0, max)).length);
  while (v && Number(v) > max) v = v.slice(0, -1);
  // '0' min > 0 bo'lsa ham qoldiriladi — admin 'oraliqdan tashqari' ogohlantirishini ko'radi
  return v;
}

export function bannedWordIn(name, words) {
  const n = name.replace(APOSTROPHES, "'").toLowerCase();
  return words.find((w) => w && n.includes(String(w).replace(APOSTROPHES, "'").toLowerCase())) ?? null;
}

/* Tana sirti (ellips) bo'ylab yoy uzunligi: t — sirtdagi burchak (0 — orqa/old markazi), s(t) — markazdan px.
   Matn qatlami ustunlari s bo'yicha joylashadi: o'rtada to'g'ri, chetlarga va burilishga qarab siqiladi. */
const arcs = new WeakMap();
function arcOf(surface) {
  if (!arcs.has(surface)) {
    const n = 512;
    const ss = new Float64Array(n + 1);
    for (let i = 1; i <= n; i += 1) {
      const t = -Math.PI + (2 * Math.PI * (i - 0.5)) / n;
      ss[i] = ss[i - 1] + Math.hypot(surface.a * Math.cos(t), surface.b * Math.sin(t)) * ((2 * Math.PI) / n);
    }
    const mid = ss[n / 2];
    for (let i = 0; i <= n; i += 1) ss[i] -= mid;
    arcs.set(surface, ss);
  }
  return arcs.get(surface);
}
function arcAt(ss, t) {
  const n = ss.length - 1;
  const f = ((t + Math.PI) / (2 * Math.PI)) * n;
  const i = Math.max(0, Math.min(n - 1, Math.floor(f)));
  return ss[i] + (ss[i + 1] - ss[i]) * (f - i);
}
const facesCamera = ({ a, b, theta }, t) => b * Math.cos(t) * Math.cos(theta) - a * Math.sin(t) * Math.sin(theta) > 0;

/* Matn qatlami — qurilma pikselida (K = bufer px / kadr px), tanlangan shrift, harflar orasi, ixtiyoriy kontur.
   Balandlik — bosh harflar balandligi (z.size, 'H0' bo'yicha), qatlam o'lchami esa shu matnning haqiqiy chegaralaridan:
   Й Ё Ў ustidagi belgilar, Д Ц Щ Қ Ҳ pastki chiqiqlari va kontur kesilmaydi. */
// Matn maxW dan keng bo'lsa shrift kichraytiriladi (masalan, keng shriftda "88" 120% da tana chetiga chiqmasin)
export const fitFont = (px, inkW, maxW) => (maxW > 0 && inkW > maxW ? (px * maxW) / inkW : px);

const layerCache = new Map();
function textLayer(text, z, font, color, outline, K) {
  const key = [text, font.id, z.size, Math.round(z.maxW || 0), z.track, color, outline, K.toFixed(3)].join('|');
  if (layerCache.has(key)) return layerCache.get(key);
  const c = document.createElement('canvas');
  const x = c.getContext('2d', { willReadFrequently: true });
  const setFont = (px) => {
    x.font = fontCss(font, px);
    if ('letterSpacing' in x) x.letterSpacing = `${z.track * K}px`;
  };
  setFont(100);
  const capRatio = x.measureText('H0').actualBoundingBoxAscent / 100 || 0.72;
  let px = (z.size * K) / capRatio;
  setFont(px);
  let m = x.measureText(text);
  const inkWidth = (mm) => (mm.actualBoundingBoxLeft || 0) + (mm.actualBoundingBoxRight || mm.width);
  const fitted = fitFont(px, inkWidth(m), (z.maxW || 0) * K);
  if (fitted !== px) {
    px = fitted;
    setFont(px);
    m = x.measureText(text);
  }
  const stroke = outline ? Math.max(K, px * capRatio * 0.045) : 0;
  const pad = Math.ceil(stroke) + 2;
  const ascent = Math.ceil(m.actualBoundingBoxAscent);
  const descent = Math.ceil(m.actualBoundingBoxDescent);
  const left = m.actualBoundingBoxLeft || 0;
  c.width = Math.max(1, Math.ceil(inkWidth(m)) + pad * 2);
  c.height = Math.max(1, ascent + descent + pad * 2);
  setFont(px); // o'lcham o'zgarganda kontekst holati tozalanadi
  x.lineJoin = 'round';
  const baseline = pad + ascent;
  if (outline) {
    x.strokeStyle = outline;
    x.lineWidth = stroke * 2;
    x.strokeText(text, pad + left, baseline);
  }
  x.fillStyle = color;
  x.fillText(text, pad + left, baseline);
  const layer = { data: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, baseline };
  if (layerCache.size > 24) layerCache.delete(layerCache.keys().next().value);
  layerCache.set(key, layer);
  return layer;
}

// Suratning piksellari va kiyim maskasi — kadr bo'yicha, joylashuv — kadr va masshtab bo'yicha keshlanadi
const pixelCache = new WeakMap();
function pixels(img) {
  if (!pixelCache.has(img)) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const data = x.getImageData(0, 0, c.width, c.height);
    pixelCache.set(img, { data, mask: garmentMask(data) });
  }
  return pixelCache.get(img);
}
// 45° kadrda ko'zgudek chizilgan gerb mato bilan yamalgan nusxa: { data, canvas } yoki null — kadr va 180° kadr
// tayyorligi bo'yicha keshlanadi. Raqam yozilmagan bo'lsa ham shu kadr chiziladi — birinchi raqamda gerb miltillamaydi.
const healed = new WeakMap();
function healedFor(frame, img, backImg) {
  if (frame !== 1) return null;
  const key = backImg ? 1 : 0;
  if (!healed.has(img) || healed.get(img).key !== key) {
    const data = healedPixels(frame, pixels(img).data, backImg && pixels(backImg).data);
    let canvas = null;
    if (data) {
      canvas = Object.assign(document.createElement('canvas'), { width: data.width, height: data.height });
      canvas.getContext('2d').putImageData(new ImageData(data.data, data.width, data.height), 0, 0);
    }
    healed.set(img, { key, value: data && { data, canvas } });
  }
  return healed.get(img).value;
}

const prints = new WeakMap();
function printFor(frame, img, backImg, scale) {
  if (!prints.has(img)) prints.set(img, new Map());
  const byKey = prints.get(img);
  // 180° kadr yuklanmagan bo'lsa ham keshlanadi, lekin alohida kalit bilan — yuklangach qayta o'lchanadi.
  // Yamalgan kadrda o'lchanadi: o'chirilgan gerbni logoTop logotip deb ko'rmaydi
  const key = `${backImg ? 1 : 0}|${scale}`;
  const source = healedFor(frame, img, backImg)?.data ?? pixels(img).data;
  if (!byKey.has(key)) byKey.set(key, printLayout(frame, source, backImg && pixels(backImg).data, scale));
  return { zones: byKey.get(key), mask: pixels(img).mask };
}

/* Matnni tana sirtiga "kiyintirish" — teskari tanlov: buferning har ustuni uchun sirtdagi burchak t va yoy s topiladi,
   matn qatlamidan shu joy bilinear olinadi. Ustunlar bir-birini qoplamaydi — burilishlarda qorong'i chiziqlar bo'lmaydi.
   Kiyim maskasi (mato bo'lmagan joy — qo'l, fon) shaffoflikka ko'paytiriladi. */
function warp(layer, z, mask, imgW, K, bw, bh) {
  const S = z.surface;
  const R = projectedHalf(S);
  const phi = Math.atan2(S.b * Math.sin(S.theta), S.a * Math.cos(S.theta));
  const ss = arcOf(S);
  const s0 = arcAt(ss, S.t0 || 0);
  const top = (z.y - CROP.y) * K - layer.baseline;
  const y0 = Math.max(0, Math.floor(top));
  const y1 = Math.min(bh, Math.ceil(top + layer.h));
  const cols = [];
  for (let X = Math.max(0, Math.floor((S.mid - R - CROP.x) * K)); X < Math.min(bw, Math.ceil((S.mid + R - CROP.x) * K)); X += 1) {
    const xs = CROP.x + (X + 0.5) / K;
    const u = (xs - S.mid) / R;
    if (Math.abs(u) >= 1) continue;
    const t = Math.asin(u) - phi;
    if (!facesCamera(S, t)) continue;
    const lc = (arcAt(ss, t) - s0) * K + layer.w / 2 - 0.5;
    if (lc > -1 && lc < layer.w) cols.push([X, lc, xs]);
  }
  if (!cols.length || y1 <= y0) return null;
  const x0 = cols[0][0];
  const w = cols[cols.length - 1][0] - x0 + 1;
  const h = y1 - y0;
  // premultiplied RGBA — bilinear chetlarda qora hoshiya bermasin
  const ink = new Float32Array(w * h * 4);
  const L = layer.data;
  const tap = (xx, yy) => (xx < 0 || yy < 0 || xx >= layer.w || yy >= layer.h ? -1 : (yy * layer.w + xx) * 4);
  for (const [X, lc, xs] of cols) {
    const cx0 = Math.floor(lc);
    const ax = lc - cx0;
    const mx = xs - 0.5;
    const mx0 = Math.floor(mx);
    const mfx = mx - mx0;
    for (let Y = y0; Y < y1; Y += 1) {
      const ly = Y - top;
      const cy0 = Math.floor(ly);
      const ay = ly - cy0;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const [dx, dy, wt] of [[0, 0, (1 - ax) * (1 - ay)], [1, 0, ax * (1 - ay)], [0, 1, (1 - ax) * ay], [1, 1, ax * ay]]) {
        const i = tap(cx0 + dx, cy0 + dy);
        if (i < 0 || !wt) continue;
        const pa = (L[i + 3] / 255) * wt;
        r += L[i] * pa;
        g += L[i + 1] * pa;
        b += L[i + 2] * pa;
        a += pa;
      }
      if (a < 0.002) continue;
      if (mask) {
        const my = CROP.y + (Y + 0.5) / K - 0.5;
        const my0 = Math.floor(my);
        const mfy = my - my0;
        const mAt = (xx, yy) => mask[yy * imgW + xx] || 0;
        const m = ((mAt(mx0, my0) * (1 - mfx) + mAt(mx0 + 1, my0) * mfx) * (1 - mfy)
          + (mAt(mx0, my0 + 1) * (1 - mfx) + mAt(mx0 + 1, my0 + 1) * mfx) * mfy) / 255;
        r *= m;
        g *= m;
        b *= m;
        a *= m;
      }
      const o = ((Y - y0) * w + (X - x0)) * 4;
      ink[o] = r;
      ink[o + 1] = g;
      ink[o + 2] = b;
      ink[o + 3] = a;
    }
  }
  return { x: x0, y: y0, w, h, ink };
}

/* Matoga "yopishtirish" (qurilma pikselida, radiuslar K ga ko'paytiriladi):
   - burma: harflar mato relyefi bo'ylab siljiydi (Photoshop'dagi Displace kabi) — yorqinlik gradientiga qarab, MAX_SHIFT px gacha;
   - soya: yorqinlik atrofdagi (SHADE_R) o'rtachaga nisbatan — mato rangi emas, faqat soya va burmalar ta'sir qiladi;
   - yo'l-yo'l formalar (ar, fcb, psg): rang chegarasi (r−g, g−b xromatikasi atrofda keskin o'zgaradi) burma emas —
     u yerda siljish, soya va yaltirash so'ndiriladi, aks holda harflar chiziq chetida yirtiladi va oqarib ketadi;
   - plyonka: burmalarning yorug' joyida yumshoq yaltirash (≤ SHEEN_MAX, qora bosmani kulrang qilmaydi) va mayda don. */
const SHADE_R = 9;
const BEND_R = 4;
const MAX_SHIFT = 3;
const SHEEN_MAX = 18;
function shadeInto(ctx, zone, K) {
  const pad = Math.ceil(MAX_SHIFT * K) + 1;
  const Rs = Math.max(1, Math.round(SHADE_R * K));
  const Rb = Math.max(1, Math.round(BEND_R * K));
  const margin = pad + Rs + 1;
  const bx = Math.max(0, zone.x - margin);
  const by = Math.max(0, zone.y - margin);
  const bw = Math.min(ctx.canvas.width, zone.x + zone.w + margin) - bx;
  const bh = Math.min(ctx.canvas.height, zone.y + zone.h + margin) - by;
  if (bw <= 2 || bh <= 2) return;
  const base = ctx.getImageData(bx, by, bw, bh);
  const B = base.data;
  // integral tasvirlar — yorqinlik va xromatika (o'rtacha va dispersiya) har nuqta atrofida tez hisoblanadi
  const stride = bw + 1;
  const IL = new Float64Array(stride * (bh + 1));
  const IC = new Float64Array(stride * (bh + 1));
  const ID = new Float64Array(stride * (bh + 1));
  const IC2 = new Float64Array(stride * (bh + 1));
  const ID2 = new Float64Array(stride * (bh + 1));
  const Lum = new Float32Array(bw * bh);
  for (let r = 0; r < bh; r += 1) {
    let sl = 0;
    let sc = 0;
    let sd = 0;
    let sc2 = 0;
    let sd2 = 0;
    for (let c = 0; c < bw; c += 1) {
      const p = (r * bw + c) * 4;
      const l = 0.299 * B[p] + 0.587 * B[p + 1] + 0.114 * B[p + 2];
      const cr = B[p] - B[p + 1];
      const cb = B[p + 1] - B[p + 2];
      Lum[r * bw + c] = l;
      sl += l;
      sc += cr;
      sd += cb;
      sc2 += cr * cr;
      sd2 += cb * cb;
      const o = (r + 1) * stride + c + 1;
      IL[o] = IL[o - stride] + sl;
      IC[o] = IC[o - stride] + sc;
      ID[o] = ID[o - stride] + sd;
      IC2[o] = IC2[o - stride] + sc2;
      ID2[o] = ID2[o - stride] + sd2;
    }
  }
  const box = (I, c, r, R) => {
    const c0 = Math.max(0, c - R);
    const c1 = Math.min(bw, c + R + 1);
    const r0 = Math.max(0, r - R);
    const r1 = Math.min(bh, r + R + 1);
    return (I[r1 * stride + c1] - I[r0 * stride + c1] - I[r1 * stride + c0] + I[r0 * stride + c0]) / ((c1 - c0) * (r1 - r0));
  };
  const clampShift = (v) => Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, v)) * K;
  const ink = zone.ink;
  // Siljigan joydagi bosma pikseli (bilinear, premultiplied)
  const sample = (fx, fy, out) => {
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const ax = fx - x0;
    const ay = fy - y0;
    out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0;
    for (let k = 0; k < 4; k += 1) {
      const xx = x0 + (k & 1);
      const yy = y0 + (k >> 1);
      if (xx < 0 || yy < 0 || xx >= zone.w || yy >= zone.h) continue;
      const wt = ((k & 1) ? ax : 1 - ax) * ((k >> 1) ? ay : 1 - ay);
      const i = (yy * zone.w + xx) * 4;
      out[0] += ink[i] * wt;
      out[1] += ink[i + 1] * wt;
      out[2] += ink[i + 2] * wt;
      out[3] += ink[i + 3] * wt;
    }
  };
  const px = new Float32Array(4);
  const rowEnd = Math.min(bh, zone.y + zone.h + pad - by);
  const colEnd = Math.min(bw, zone.x + zone.w + pad - bx);
  for (let r = Math.max(1, zone.y - pad - by); r < rowEnd - 1; r += 1) {
    for (let c = Math.max(1, zone.x - pad - bx); c < colEnd - 1; c += 1) {
      // xromatika dispersiyasi katta — oyna rang chegarasini kesib o'tadi (yo'l-yo'l forma), burma emas
      const ec = box(IC2, c, r, Rs) - box(IC, c, r, Rs) ** 2;
      const ed = box(ID2, c, r, Rs) - box(ID, c, r, Rs) ** 2;
      const edge = Math.sqrt(Math.max(0, ec)) + Math.sqrt(Math.max(0, ed));
      const fold = Math.max(0, Math.min(1, 1 - (edge - 4) / 16));
      const gx = (box(IL, c + Rb, r, Rb) - box(IL, c - Rb, r, Rb)) / (2 * Rb / K);
      const gy = (box(IL, c, r + Rb, Rb) - box(IL, c, r - Rb, Rb)) / (2 * Rb / K);
      const fx = c + bx - zone.x - clampShift(gx * 0.35) * fold;
      const fy = r + by - zone.y - clampShift(gy * 0.35) * fold;
      sample(fx, fy, px);
      const alpha = px[3] * 0.95;
      if (alpha < 0.004) continue;
      const p = r * bw + c;
      const rel = Lum[p] / (box(IL, c, r, Rs) || 1);
      const shade = 1 + (Math.min(1.12, Math.max(0.7, rel)) - 1) * (0.3 + 0.7 * fold);
      const ir = px[0] / px[3];
      const ig = px[1] / px[3];
      const ib = px[2] / px[3];
      const inkL = 0.299 * ir + 0.587 * ig + 0.114 * ib;
      const sheen = Math.min(SHEEN_MAX, Math.max(0, rel - 1) * 90) * fold * (0.3 + 0.7 * (inkL / 255));
      const grain = ((((p + bx * 7 + by * 13) * 2654435761) >>> 0) % 9) - 4;
      const o = p * 4;
      B[o] = B[o] * (1 - alpha) + (ir * shade * 0.94 + B[o] * 0.06 + sheen + grain) * alpha;
      B[o + 1] = B[o + 1] * (1 - alpha) + (ig * shade * 0.94 + B[o + 1] * 0.06 + sheen + grain) * alpha;
      B[o + 2] = B[o + 2] * (1 - alpha) + (ib * shade * 0.94 + B[o + 2] * 0.06 + sheen + grain) * alpha;
    }
  }
  ctx.putImageData(base, bx, by);
}

const ready = (im) => Boolean(im && im.complete && im.naturalWidth > 0);

function paint(canvas, img, frame, { name, number, team, style }, backImg) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // 45° da ko'zgudek chizilgan gerb doim yamalgan (raqam va gerb oyoqdan oyoqqa sakramasin, birinchi raqamda miltillamasin)
  const source = healedFor(frame, img, backImg)?.canvas ?? img;
  ctx.drawImage(source, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, canvas.width, canvas.height);
  if (!name && !number) return;
  const K = canvas.width / CROP.w;
  const { zones, mask } = printFor(frame, img, backImg, style.scale);
  for (const z of zones) {
    const text = z.text === 'name' ? name : number;
    if (!text) continue;
    // Shortikda klub rangi saqlanadi, agar admin raqam rangini o'zgartirmagan bo'lsa (shortik boshqa rangda)
    const color = z.text === 'name' ? style.nameColor
      : z.shorts && style.numberColor === team.ink && team.shortsInk ? team.shortsInk : style.numberColor;
    const layer = textLayer(text, z, style.font, color, z.shorts ? null : team.outline, K);
    const zone = warp(layer, z, mask, img.naturalWidth, K, canvas.width, canvas.height);
    if (zone) shadeInto(ctx, zone, K);
  }
}

const defaultStyle = (team, font = FONTS[0], scale = 1) => ({ font, scale, nameColor: team.ink, numberColor: team.ink });
const dprNow = () => Math.min(window.devicePixelRatio || 1, 2);

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
  const [rules, setRules] = useState(DEFAULT_ORDER_RULES);
  const [banned, setBanned] = useState([]);
  const [dpr, setDpr] = useState(dprNow);
  const [fontsCss, setFontsCss] = useState(false);
  const [tick, setTick] = useState(0);
  const repaint = useCallback(() => setTick((n) => n + 1), []);

  const image = useCallback((id, i) => {
    const key = `${id}/${i}`;
    if (!cache.current[key]) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = repaint;
      im.onerror = () => {
        im.failed = true;
        repaint();
      };
      im.src = frameUrl(id, i);
      cache.current[key] = im;
    }
    return cache.current[key];
  }, [repaint]);

  const img = image(team.id, frame);
  const back = image(team.id, 4);
  const imgReady = ready(img);
  const backReady = ready(back);
  const status = imgReady ? 'ok' : img.failed ? 'error' : 'loading';
  const shown = printText(name);

  // Tanlangan jamoaning barcha burchaklari oldindan yuklanadi — aylantirganda kutish bo'lmaydi
  useEffect(() => {
    for (let i = 0; i < N; i += 1) image(team.id, i);
  }, [team.id, image]);

  // Platforma qoidalari: ism uzunligi, raqam oralig'i va taqiqlangan so'zlar (Sozlamalar → Buyurtma qoidalari)
  useEffect(() => {
    let active = true;
    loadSettings()
      .then((all) => {
        if (!active) return;
        setRules({ ...DEFAULT_ORDER_RULES, ...(all?.[SETTING_KEYS.orderRules] ?? {}) });
        const words = all?.[SETTING_KEYS.bannedWords];
        setBanned(Array.isArray(words) ? words : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setName((n) => cleanName(n, rules.printNameMaxLength));
    setNumber((n) => cleanNumber(n, rules.printNumberMin, rules.printNumberMax));
  }, [rules]);

  useEffect(() => {
    const onResize = () => setDpr(dprNow());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Shriftlar: avval stylesheet yuklanadi (aks holda document.fonts.load hali e'lon qilinmagan shriftni "tayyor" deydi),
     keyin aynan chizilayotgan harflar bilan — Google Fonts kerakli cyrillic / cyrillic-ext .woff2 bo'lagini yuklaydi. */
  useEffect(() => {
    let link = document.querySelector(`link[href="${FONTS_CSS}"]`);
    if (!link) {
      link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS_CSS });
      document.head.appendChild(link);
    }
    const done = () => setFontsCss(true);
    if (link.sheet) done();
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    return () => {
      link.removeEventListener('load', done);
      link.removeEventListener('error', done);
    };
  }, []);
  // Yuklash tugagach "loadingdone" keladi — o'shanda eski (zaxira shriftli) qatlamlar tashlanib, qayta chiziladi
  useEffect(() => {
    if (fontsCss && document.fonts) document.fonts.load(fontCss(style.font, 48), `${shown} ${number} ${FONT_SAMPLE}`).catch(() => {});
  }, [fontsCss, style.font, shown, number]);
  // Barcha 6 shriftning kirill qismlari oldindan — tugmalarni almashtirganda zaxira shrift miltillamaydi
  useEffect(() => {
    if (fontsCss && document.fonts) FONTS.forEach((f) => document.fonts.load(fontCss(f, 48), FONT_SAMPLE).catch(() => {}));
  }, [fontsCss]);
  useEffect(() => {
    if (!document.fonts) return undefined;
    const onFonts = () => {
      layerCache.clear();
      repaint();
    };
    document.fonts.addEventListener('loadingdone', onFonts);
    return () => document.fonts.removeEventListener('loadingdone', onFonts);
  }, [repaint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!imgReady) {
      // Eski jamoa kadri qolib ketmasin — kanvas tozalanadi, ustida skeleton ko'rinadi
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#b2b2b3';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    // 180° kadr hali yuklanmagan yoki xato bo'lsa — joylashuv joriy kadrning o'zidan o'lchanadi
    paint(canvas, img, frame, { name: shown, number, team, style }, backReady ? back : null);
  }, [img, back, imgReady, backReady, frame, shown, number, team, style, dpr, tick]);

  // Ism — orqa tomonda; raqam, shrift, o'lcham — oldidan (shortik) qarab turgan bo'lsa ham shu yerda qoladi
  const toBack = () => setFrame((f) => (f in BACK_FRAMES ? f : 4));
  const toPrint = () => setFrame((f) => (f in BACK_FRAMES || f in FRONT_FRAMES ? f : 4));
  const turn = (step) => setFrame((f) => (f + step + N) % N);
  const pickTeam = (tm) => {
    setTeam(tm);
    setStyle((st) => defaultStyle(tm, st.font, st.scale));
  };
  // Tozalashdan keyin kursor joyida qoladi (o'rtadan tahrirlaganda oxiriga sakramaydi)
  const keepCaret = (el, pos) => requestAnimationFrame(() => {
    if (document.activeElement === el) el.setSelectionRange(pos, pos);
  });
  const onName = (e) => {
    const el = e.target;
    const pos = cleanName(el.value.slice(0, el.selectionStart ?? el.value.length), rules.printNameMaxLength).length;
    setName(cleanName(el.value, rules.printNameMaxLength));
    keepCaret(el, pos);
    toBack();
  };
  const onNumber = (e) => {
    const el = e.target;
    const pos = cleanNumber(el.value.slice(0, el.selectionStart ?? el.value.length), -1, Infinity).length;
    const next = cleanNumber(el.value, rules.printNumberMin, rules.printNumberMax);
    setNumber(next);
    keepCaret(el, Math.min(pos, next.length));
    toPrint();
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

  const bannedWord = bannedWordIn(shown, banned);
  const numberLow = number !== '' && Number(number) < rules.printNumberMin;
  const views = [
    { label: 'Old', frame: 0 },
    { label: 'Yon', frame: 2 },
    { label: 'Orqa', frame: 4 },
  ];
  const field = { display: 'flex', flexDirection: 'column', gap: 6 };
  const warn = { color: 'var(--sa-accent)', fontSize: 12.5 };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Forma 360°')}</h1>
          <p>{t("Mijoz ismi va raqamini yozsa, ular forma orqasida darhol ko'rinadi")}</p>
        </div>
      </div>

      <div className="sa-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 360, flex: '0 1 360px' }}>
          <canvas
            ref={canvasRef}
            width={Math.round(W * dpr)}
            height={Math.round(H * dpr)}
            tabIndex={0}
            aria-label={t('{team} formasi, {deg}°. Strelkalar bilan aylantiring', { team: t(team.name), deg: frame * 45 })}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            onKeyDown={onKeyDown}
            style={{
              display: 'block', width: '100%', aspectRatio: '3 / 4', borderRadius: 12, background: '#b2b2b3',
              touchAction: 'pan-y', cursor: 'grab',
            }}
          />
          {status !== 'ok' && (
            <div
              role="status"
              style={{
                position: 'absolute', inset: 0, borderRadius: 12, display: 'grid', placeItems: 'center',
                background: 'linear-gradient(180deg, #c4c4c5 0%, #a9a9aa 100%)', color: '#2a2f3d', fontSize: 13, fontWeight: 600,
              }}
            >
              {status === 'error' ? t('Surat yuklanmadi') : t('Yuklanmoqda...')}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="sa-table__sub" style={{ marginBottom: 8 }}>{t('Jamoa')}</div>
            {[['national', 'Terma jamoalar'], ['club', 'Klublar']].map(([kind, title]) => (
              <div key={kind} role="group" aria-label={t(title)} style={{ marginBottom: 10 }}>
                <div className="sa-table__sub" style={{ marginBottom: 6, fontSize: 11.5, opacity: 0.8 }}>{t(title)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TEAMS.filter((tm) => tm.kind === kind).map((tm) => (
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
            ))}
          </div>

          <label style={field}>
            <span className="sa-table__sub">{t('Ism')}</span>
            <input className="sa-input" value={name} placeholder="ISROIL" onChange={onName} />
            {bannedWord && <span role="alert" style={warn}>{t("Bu ismda taqiqlangan so'z bor: {word}", { word: bannedWord })}</span>}
          </label>
          <label style={field}>
            <span className="sa-table__sub">{t('Raqam')}</span>
            <input className="sa-input" value={number} inputMode="numeric" placeholder="10" onChange={onNumber} />
            {numberLow && (
              <span role="alert" style={warn}>
                {t("Raqam {min} dan {max} gacha bo'lishi kerak", { min: rules.printNumberMin, max: rules.printNumberMax })}
              </span>
            )}
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
                  onClick={() => { setStyle((st) => ({ ...st, font: f })); toPrint(); }}
                  style={{ fontFamily: 'var(--font-body)', gap: 8 }}
                >
                  {t(f.label)}
                  <span aria-hidden="true" style={{ fontFamily: `${f.family}, sans-serif`, fontWeight: f.weight, letterSpacing: '0.04em' }}>
                    AB 10
                  </span>
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
              onChange={(e) => { setStyle((st) => ({ ...st, scale: Number(e.target.value) / 100 })); toPrint(); }}
            />
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <label style={{ ...field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={style.nameColor}
                onChange={(e) => { setStyle((st) => ({ ...st, nameColor: e.target.value })); toBack(); }}
              />
              <span className="sa-table__sub">{t('Ism rangi')}</span>
            </label>
            <label style={{ ...field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={style.numberColor}
                onChange={(e) => { setStyle((st) => ({ ...st, numberColor: e.target.value })); toPrint(); }}
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
            {frame * 45}° · {t("Suratni sudrab aylantiring. Ism va raqam orqadan (135°–225°), shortikdagi raqam oldidan (315°–45°) ko'rinadi")}
          </div>
        </div>
      </div>
    </>
  );
}
