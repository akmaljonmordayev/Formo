/**
 * Forma siluetiga oid sof matematika (three.js'siz): andaza konturi, chok masofasi va mato chuqurligi.
 * reference/forma-3d.html dagi mantiqning o'zi — raqamlar o'zgartirilmagan.
 *
 * Kontur o'ng yarmi yoqa markazidan soat yo'nalishida. Har bo'lak teg oladi:
 * 'neck', 'cuff', 'hem' — OCHIQ qirralar (forma u yerda quvur), qolganlari ('seam') — tikilgan chok.
 */

/** Andaza koordinatalari chegarasi (UV va teksturalar shu to'rtburchakka bog'langan) */
export const BOUNDS = { minX: -1.08, maxX: 1.08, minY: -1.16, maxY: 1.18 };
export const BOUNDS_W = BOUNDS.maxX - BOUNDS.minX;
export const BOUNDS_H = BOUNDS.maxY - BOUNDS.minY;

/** Yoqa yelka choki bilan uchrashadigan nuqta */
const NECK_SH = [0.255, 1.14];

/** Dizayndagi yoqa → kontur nomi ('back' — orqa panel) */
export const outlineName = (neck) => (neck === 'v' ? 'front-v' : 'front');

/** Kvadratik Bezye egri chizig'idagi n ta nuqta (boshlanish nuqtasisiz) */
export function quad(p0, c, p1, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const d = t * t;
    out.push([a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]]);
  }
  return out;
}

/** @param {'front'|'front-v'|'back'} name */
export function halfOutline(name) {
  const segs = [];
  let start;
  if (name === 'front-v') {
    start = [0, 0.8];
    segs.push(['neck', quad(start, [0.13, 0.97], NECK_SH, 14)]);
  } else if (name === 'front') {
    start = [0, 0.905];
    segs.push(['neck', quad(start, [0.21, 0.9], NECK_SH, 14)]);
  } else {
    start = [0, 1.085];
    segs.push(['neck', quad(start, [0.19, 1.09], NECK_SH, 14)]);
  }
  segs.push(['seam', quad(NECK_SH, [0.43, 1.11], [0.6, 1.04], 8)]); // qiya yelka
  segs.push(['seam', quad([0.6, 1.04], [0.8, 0.93], [0.985, 0.655], 12)]); // yeng usti
  segs.push(['cuff', quad([0.985, 0.655], [0.9, 0.55], [0.8, 0.45], 8)]); // yeng og'zi
  segs.push(['seam', quad([0.8, 0.45], [0.645, 0.59], [0.565, 0.55], 10)]); // qo'ltiq
  segs.push(['seam', quad([0.565, 0.55], [0.5, -0.22], [0.585, -1.0], 22)]); // yon chok, bel bilan
  segs.push(['seam', quad([0.585, -1.0], [0.592, -1.07], [0.53, -1.08], 4)]);
  segs.push(['hem', quad([0.53, -1.08], [0.27, -1.125], [0, -1.11], 14)]);
  return { start, segs };
}

/** To'liq yopiq ko'pburchak va teglangan qirralar ro'yxati */
export function buildOutline(name) {
  const { start, segs } = halfOutline(name);
  const right = [{ p: start, tag: null }];
  segs.forEach(([tag, pts]) => pts.forEach((p) => right.push({ p, tag })));
  // nuqta tegi — shu nuqtada tugaydigan bo'lak tegi
  const leftHalf = [];
  for (let i = right.length - 2; i >= 1; i--) leftHalf.push({ p: [-right[i].p[0], right[i].p[1]], tag: right[i].tag });
  const pts = right.concat(leftHalf);
  const edges = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const tag = i + 1 < right.length ? b.tag : i + 1 === pts.length ? 'neck' : a.tag;
    edges.push({ a: a.p, b: b.p, tag });
  }
  return { poly: pts.map((o) => o.p), edges };
}

/** Nuqtadan kesmagacha masofa va kesmadagi eng yaqin nuqta: [d, px, py] */
export function segDist(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = dx * dx + dy * dy;
  let t = L ? ((x - a[0]) * dx + (y - a[1]) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + t * dx;
  const py = a[1] + t * dy;
  return [Math.hypot(px - x, py - y), px, py];
}

export function insidePoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Choklar (yelka, yeng, yon) old va orqa uchun umumiy — orqa kontur choklari olinadi
const SEAM_EDGES = buildOutline('back').edges.filter((e) => e.tag === 'seam');

function seamDist(x, y) {
  let m = Infinity;
  for (const e of SEAM_EDGES) {
    const d = segDist(x, y, e.a, e.b)[0];
    if (d < m) m = d;
  }
  return m;
}

/** Mato sirtining chuqurligi: tikilgan choklardan uzoqlashgan sari o'sadi, yoqa/yeng/etakda ochiq qoladi */
export function depth(x, y, back) {
  const d = seamDist(x, y);
  const R = 0.4;
  const D = back ? 0.205 : 0.25;
  const t = Math.min(d / R, 1);
  let z = D * (1 - Math.pow(1 - t, 2.2));
  z *= 0.92 + 0.08 * (1 - Math.min(Math.abs(x) / 0.6, 1)); // dumaloqroq ko'krak
  if (!back) z += 0.035 * Math.exp(-((y - 0.45) ** 2) / 0.12) * t; // ko'krak hajmi
  // yumshoq burmalar: qo'ltiq tortilishi va pastki qismdagi to'lqinlar
  const fold =
    0.01 * Math.sin(x * 7.5 + y * 2.2) * Math.max(0, 0.3 - y) * t +
    0.012 * Math.exp(-((Math.abs(x) - 0.45) ** 2 / 0.01 + (y - 0.38) ** 2 / 0.05)) * Math.sin(Math.abs(x) * 40 + y * 18) +
    0.004 * Math.sin(y * 21 + x * 3) * t;
  return (z + fold) * (back ? -1 : 1);
}
