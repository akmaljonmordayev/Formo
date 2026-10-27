/** Rang yordamchilari (prototipdagi kabi): hex → [r,g,b] va ochroq/to'qroq soya */

export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** f > 0 — oqqa, f < 0 — qoraga qarab aralashtiradi (|f| ∈ [0,1]) */
export function shade(hex, f) {
  const [r, g, b] = rgb(hex);
  const k = f < 0 ? 0 : 255;
  const t = Math.abs(f);
  return `rgb(${Math.round(r + (k - r) * t)},${Math.round(g + (k - g) * t)},${Math.round(b + (k - b) * t)})`;
}
