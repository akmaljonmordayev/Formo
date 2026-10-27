import { normalizeDesign, normalizePrint } from './design.js';
import { BOUNDS, BOUNDS_H, BOUNDS_W } from './outline.js';
import { shade } from './color.js';

/**
 * Canvas teksturalari (reference/forma-3d.html dan): naqsh, konstruksiya (to'r qo'shimchalar, choklar),
 * nishon, homiy, orqada ism va raqam. three.js'siz — faqat 2D canvas; canvas yaratish tashqaridan berilishi mumkin.
 * Hamma o'lchamlar andaza birligida, shuning uchun 1024 (mobil) va 2048 (admin) bir xil ko'rinadi.
 */

export const KIT_FONT_FAMILY = "'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif";

const SLEEVE = [[0.6, 1.15], [1.2, 1.15], [1.2, 0.4], [0.7, 0.4], [0.565, 0.55], [0.59, 0.8]];

function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const defaultCanvas = (w, h) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
};

/** Andaza → piksel o'girgichlari (S — tekstura tomoni) */
function mapper(S) {
  return {
    S,
    X: (x) => ((x - BOUNDS.minX) / BOUNDS_W) * S,
    Y: (y) => (1 - (y - BOUNDS.minY) / BOUNDS_H) * S,
    U: (u) => (u / BOUNDS_W) * S,
  };
}

/** Ikki rangli dizayn (split/fade)da aksent rangi yozuv rangi bo'ladi, qolganlarida ikkinchi rang */
const accentOf = (s) => (s.pattern === 'split' || s.pattern === 'fade' ? s.c3 : s.c2);

function fillSleeve(ctx, m, { X, Y }) {
  ctx.beginPath();
  SLEEVE.forEach((p, i) => {
    const x = X(p[0] * m);
    const y = Y(p[1]);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
}

function drawPattern(ctx, s, back, M) {
  const { S, X, Y, U } = M;
  const c2 = s.c2;
  ctx.save();
  if (s.pattern === 'fade') {
    const g = ctx.createLinearGradient(X(-0.6), Y(1.2), X(0.6), Y(-1.2));
    g.addColorStop(0, s.c1);
    g.addColorStop(0.55, shade(s.c1, -0.25));
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = s.c3; // pastga qarab ingichkalashadigan chiziqlar
    ctx.lineWidth = U(0.005);
    ctx.globalAlpha = 0.32;
    for (let x = -1.1; x < 1.1; x += 0.085) {
      ctx.beginPath();
      ctx.moveTo(X(x), Y(1.2));
      ctx.lineTo(X(x), Y(-0.2 - Math.abs(Math.sin(x * 9)) * 0.7));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = c2; // bir rangli yenglar
    [1, -1].forEach((m) => fillSleeve(ctx, m, M));
    ctx.fillStyle = s.c3; // ko'krak chizig'i
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, Y(0.36), S, U(0.012));
    ctx.globalAlpha = 1;
  } else if (s.pattern === 'split') {
    const side = back ? 1 : -1; // har yarmi tana atrofida uzluksiz qoladi
    ctx.fillStyle = c2;
    ctx.fillRect(side < 0 ? 0 : X(0), 0, X(0), S);
    [1, -1].forEach((m) => {
      ctx.fillStyle = m === side ? s.c1 : c2; // qarama-qarshi yenglar
      fillSleeve(ctx, m, M);
    });
  } else if (s.pattern === 'stripes') {
    ctx.fillStyle = c2;
    for (let x = -1.1; x < 1.1; x += 0.22) ctx.fillRect(X(x), 0, U(0.075), S);
  } else if (s.pattern === 'hoops') {
    ctx.fillStyle = c2;
    for (let y = -1.2; y < 1.2; y += 0.3) ctx.fillRect(0, Y(y + 0.13), S, U(0.13));
  } else if (s.pattern === 'sash') {
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(X(0.75), Y(1.2));
    ctx.lineTo(X(0.36), Y(1.2));
    ctx.lineTo(X(-0.75), Y(-1.2));
    ctx.lineTo(X(-0.36), Y(-1.2));
    ctx.closePath();
    ctx.fill();
  } else if (s.pattern === 'halftone') {
    ctx.fillStyle = c2;
    for (let y = -1.15; y < 1.2; y += 0.042) {
      const f = Math.max(0, (0.35 - y) / 1.5);
      const off = (Math.round((y + 2) / 0.042) % 2) * 0.021;
      for (let x = -1.1; x < 1.1; x += 0.042) {
        ctx.beginPath();
        ctx.arc(X(x + off), Y(y), U(0.018 * f), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (s.pattern === 'geo') {
    const r = rng(7);
    ctx.strokeStyle = c2;
    ctx.fillStyle = c2;
    for (let k = 0; k < 64; k++) {
      const cx = -1 + r() * 2;
      const cy = -1.1 + r() * 2.2;
      const sz = 0.05 + r() * 0.2;
      const n = 3 + Math.floor(r() * 3);
      ctx.globalAlpha = 0.1 + r() * 0.45;
      ctx.beginPath();
      for (let q = 0; q < n; q++) {
        const a = (q / n) * Math.PI * 2 + r();
        const rr = sz * (0.5 + r() * 0.6);
        const px = X(cx + Math.cos(a) * rr);
        const py = Y(cy + Math.sin(a) * rr);
        if (q) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      if (r() > 0.45) ctx.fill();
      else {
        ctx.lineWidth = U(0.007);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = U(0.005);
    for (let k = 0; k < 40; k++) {
      let x = -1 + r() * 2;
      let y = -1.1 + r() * 2.2;
      ctx.beginPath();
      ctx.moveTo(X(x), Y(y));
      for (let q = 0; q < 4; q++) {
        if (r() > 0.5) x += (r() - 0.5) * 0.4;
        else y += (r() - 0.5) * 0.4;
        ctx.lineTo(X(x), Y(y));
      }
      ctx.stroke();
      ctx.fillRect(X(x) - U(0.011), Y(y) - U(0.011), U(0.022), U(0.022));
    }
  }
  ctx.restore();
}

/** Yon to'r qo'shimchalar, yeng chetlari va choklar */
function drawConstruction(ctx, s, { X, Y, U }) {
  ctx.save();
  [1, -1].forEach((m) => {
    ctx.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.05) ctx.lineTo(X(m * (0.42 + 0.02 * Math.sin(t * 3))), Y(0.55 - t * 1.62));
    for (let t = 1; t >= 0; t -= 0.05) ctx.lineTo(X(m * 0.7), Y(0.55 - t * 1.62));
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = -1.15; y < 0.6; y += 0.022) {
      for (let x = 0.38; x < 0.72; x += 0.022) {
        ctx.beginPath();
        ctx.arc(X(m * (x + (Math.round(y / 0.022) % 2) * 0.011)), Y(y), U(0.0055), 0, 7);
        ctx.fill();
      }
    }
    ctx.restore();
  });
  const twoTone = s.pattern === 'split' || s.pattern === 'fade';
  ctx.strokeStyle = accentOf(s); // yeng chetidagi lenta
  ctx.lineWidth = U(twoTone ? 0.02 : 0.07);
  ctx.lineCap = 'butt';
  [1, -1].forEach((m) => {
    ctx.beginPath();
    ctx.moveTo(X(0.955 * m), Y(0.69));
    ctx.lineTo(X(0.765 * m), Y(0.48));
    ctx.stroke();
  });
  ctx.setLineDash([U(0.014), U(0.01)]); // choklar
  ctx.lineWidth = U(0.004);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  [1, -1].forEach((m) => {
    ctx.beginPath();
    ctx.moveTo(X(m * 0.6), Y(1.04));
    ctx.quadraticCurveTo(X(m * 0.6), Y(0.8), X(m * 0.565), Y(0.55)); // yeng o'rni
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(m * 0.93), Y(0.715));
    ctx.lineTo(X(m * 0.745), Y(0.5)); // yeng chetidagi chok
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(X(-0.6), Y(-1.045));
  ctx.quadraticCurveTo(X(0), Y(-1.085), X(0.6), Y(-1.045)); // etak choki
  ctx.stroke();
  ctx.restore();
}

/** Rasmni (nisbatini saqlab) andaza to'rtburchagiga joylaydi: markaz (cx, cy), o'lcham w × h */
function drawImageFit(ctx, img, cx, cy, w, h, { X, Y }) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const boxW = X(cx + w / 2) - X(cx - w / 2);
  const boxH = Y(cy - h / 2) - Y(cy + h / 2);
  const k = Math.min(boxW / iw, boxH / ih);
  const dw = iw * k;
  const dh = ih * k;
  ctx.drawImage(img, X(cx) - dw / 2, Y(cy) - dh / 2, dw, dh);
}

/** Nishon: admin yuklagan rasm yoki dizayn nomining bosh harflari bilan qalqon */
function drawCrest(ctx, s, cx, cy, M) {
  const { X, Y, U } = M;
  const w = 0.15;
  const h = 0.18;
  ctx.save();
  if (s.crest) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = U(0.01);
    drawImageFit(ctx, s.crest, cx, cy, w * 1.15, h * 1.15, M);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(X(cx - w / 2), Y(cy + h / 2));
  ctx.lineTo(X(cx + w / 2), Y(cy + h / 2));
  ctx.lineTo(X(cx + w / 2), Y(cy - h * 0.05));
  ctx.quadraticCurveTo(X(cx + w / 2), Y(cy - h * 0.38), X(cx), Y(cy - h / 2));
  ctx.quadraticCurveTo(X(cx - w / 2), Y(cy - h * 0.38), X(cx - w / 2), Y(cy - h * 0.05));
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = U(0.012);
  ctx.shadowOffsetY = U(0.004);
  ctx.fillStyle = accentOf(s);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = U(0.01);
  ctx.strokeStyle = shade(s.c2, -0.35);
  ctx.stroke();
  ctx.lineWidth = U(0.004);
  ctx.strokeStyle = s.c1;
  ctx.setLineDash([U(0.008), U(0.006)]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = s.c1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${U(0.075)}px ${KIT_FONT_FAMILY}`;
  ctx.fillText(s.initials, X(cx), Y(cy + 0.012));
  ctx.restore();
}

/** Uydirma ishlab chiqaruvchi belgisi (haqiqiy brend emas) */
function drawBrandMark(ctx, color, cx, cy, sz, { X, Y }) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(X(cx - sz), Y(cy + sz * 0.35));
  ctx.lineTo(X(cx), Y(cy - sz * 0.35));
  ctx.lineTo(X(cx + sz), Y(cy + sz * 0.35));
  ctx.lineTo(X(cx + sz * 0.62), Y(cy + sz * 0.35));
  ctx.lineTo(X(cx), Y(cy - sz * 0.02));
  ctx.lineTo(X(cx - sz * 0.62), Y(cy + sz * 0.35));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Dizayn nomidan nishon harflari: "Turon FC" → "TF", bo'sh bo'lsa "FC" */
export function crestInitials(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'FC';
  const letters = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
}

function drawSide(ctx, s, back, M) {
  const { S, X, Y, U } = M;
  const grd = ctx.createLinearGradient(0, Y(1.2), 0, Y(-1.2));
  grd.addColorStop(0, shade(s.c1, 0.05));
  grd.addColorStop(1, shade(s.c1, -0.12));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, S, S);
  drawPattern(ctx, s, back, M);
  drawConstruction(ctx, s, M);
  const tc = s.c3;
  ctx.fillStyle = tc;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (!back) {
    drawCrest(ctx, s, 0.27, 0.6, M);
    drawBrandMark(ctx, tc, -0.27, 0.62, 0.05, M);
    if (s.sponsorImage) {
      drawImageFit(ctx, s.sponsorImage, 0, 0.16, 0.7, 0.22, M);
    } else {
      ctx.fillStyle = tc;
      ctx.font = `800 ${U(0.155)}px ${KIT_FONT_FAMILY}`;
      ctx.fillText(s.sponsor.toUpperCase(), X(0), Y(0.1));
    }
    // liga yamog'i (o'ng yengda)
    ctx.beginPath();
    ctx.arc(X(-0.79), Y(0.79), U(0.055), 0, 7);
    ctx.fillStyle = '#f2f0ea';
    ctx.fill();
    ctx.lineWidth = U(0.008);
    ctx.strokeStyle = shade(s.c2, -0.3);
    ctx.stroke();
    ctx.fillStyle = '#1b1a24';
    ctx.font = `800 ${U(0.04)}px ${KIT_FONT_FAMILY}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('SL', X(-0.79), Y(0.79));
    // etakdagi yorliq
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(X(-0.47), Y(-0.86), U(0.12), U(0.06));
    ctx.fillStyle = '#16141f';
    ctx.font = `700 ${U(0.026)}px ${KIT_FONT_FAMILY}`;
    ctx.fillText('2026/27', X(-0.41), Y(-0.89));
  } else {
    ctx.font = `800 ${U(0.12)}px ${KIT_FONT_FAMILY}`;
    ctx.fillText(s.player, X(0), Y(0.66));
    ctx.font = `900 ${U(0.6)}px ${KIT_FONT_FAMILY}`;
    ctx.lineWidth = U(0.016);
    ctx.strokeStyle = shade(s.c2, -0.25);
    ctx.strokeText(s.number, X(0), Y(-0.3));
    ctx.fillText(s.number, X(0), Y(-0.3));
  }
}

/**
 * Old va orqa teksturalarini chizadi.
 * @param {import('./design.js').KitDesign} design
 * @param {{ backName?: string, number?: string|number }} [print] orqadagi ism/raqam (bo'sh — dizaynning o'zi)
 * @param {{ size?: number, createCanvas?: (w: number, h: number) => HTMLCanvasElement,
 *   images?: { crest?: CanvasImageSource|null, sponsor?: CanvasImageSource|null } }} [opts]
 * @returns {{ front: HTMLCanvasElement, back: HTMLCanvasElement }}
 */
export function drawKitTextures(design, print, opts = {}) {
  const d = normalizeDesign(design);
  const p = normalizePrint(print);
  const size = opts.size || 2048;
  const create = opts.createCanvas || defaultCanvas;
  const M = mapper(size);
  const s = {
    c1: d.primaryColor,
    c2: d.secondaryColor,
    c3: d.textColor,
    pattern: d.pattern,
    sponsor: d.sponsorText || '',
    initials: crestInitials(d.name),
    crest: opts.images?.crest || null,
    sponsorImage: opts.images?.sponsor || null,
    player: p.backName,
    number: p.number,
  };
  const draw = (back) => {
    const cv = create(size, size);
    drawSide(cv.getContext('2d'), s, back, M);
    return cv;
  };
  return { front: draw(false), back: draw(true) };
}

/** To'qima (trikotaj) relyef xaritasi — kulrang canvas, takrorlanadi */
export function drawKnitBump(createCanvas = defaultCanvas) {
  const n = 256;
  const cv = createCanvas(n, n);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(n, n);
  const r = rng(3);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const knit = (Math.sin(x * 1.57) * 0.5 + 0.5) * (Math.sin(y * 0.78 + (x % 4 < 2 ? 0 : 1.6)) * 0.5 + 0.5);
      const v = Math.round((0.3 + 0.55 * knit + r() * 0.15) * 255);
      const i = (y * n + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/** Rezinka (yoqa/manjet) chiziqlari relyefi */
export function drawRibBump(createCanvas = defaultCanvas) {
  const cv = createCanvas(64, 8);
  const ctx = cv.getContext('2d');
  for (let x = 0; x < 64; x++) {
    const v = Math.round((0.5 + 0.5 * Math.sin((x / 64) * Math.PI * 8)) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, 8);
  }
  return cv;
}
