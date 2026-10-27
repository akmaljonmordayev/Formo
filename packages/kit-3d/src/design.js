/**
 * Forma dizayni: maydonlar backend'dagi KitDesign modeli bilan bir xil nomda (camelCase).
 * Bu fayl three.js'siz — backend testlari, admin forma va mobil WebView hammasi shu qoidalarga tayanadi.
 */

/** Prototipdagi naqshlar (reference/forma-3d.html) */
export const KIT_PATTERNS = ['fade', 'split', 'geo', 'stripes', 'hoops', 'sash', 'halftone', 'plain'];

export const KIT_PATTERN_LABELS = {
  fade: 'Oqim (gradient)',
  split: "Ikki rangga bo'lingan",
  geo: 'Raqamli naqsh',
  stripes: 'Vertikal chiziqlar',
  hoops: 'Gorizontal chiziqlar',
  sash: 'Diagonal lenta',
  halftone: 'Nuqtali gradient',
  plain: 'Oddiy',
};

export const KIT_NECKS = ['round', 'v'];

export const KIT_NECK_LABELS = { round: 'Dumaloq', v: 'V-simon' };

export const BACK_NAME_MAX = 12;

/**
 * @typedef {Object} KitDesign
 * @property {string} [name]
 * @property {string} primaryColor   asosiy rang, #rrggbb
 * @property {string} secondaryColor naqsh/yenglar rangi, #rrggbb
 * @property {string} textColor      yozuvlar rangi, #rrggbb
 * @property {string} pattern        KIT_PATTERNS dan biri
 * @property {string} neck           'round' | 'v'
 * @property {string} [sponsorText]
 * @property {string|null} [crestImageUrl]
 * @property {string|null} [sponsorImageUrl]
 * @property {string|null} [modelGlbUrl]
 */

/** @type {KitDesign} */
export const DEFAULT_KIT_DESIGN = Object.freeze({
  name: '',
  primaryColor: '#1f6f8b',
  secondaryColor: '#0b1d2a',
  textColor: '#e3c27a',
  pattern: 'fade',
  neck: 'round',
  sponsorText: '',
  crestImageUrl: null,
  sponsorImageUrl: null,
  modelGlbUrl: null,
});

/** Tayyor ranglar (prototipdagi presetlar) — admin tahrirlovchida tez tanlash uchun */
export const KIT_PRESETS = [
  { id: 'oqim', name: 'Oqim', primaryColor: '#1f6f8b', secondaryColor: '#0b1d2a', textColor: '#e3c27a', pattern: 'fade' },
  { id: 'ikki', name: 'Ikki rang', primaryColor: '#0f5a46', secondaryColor: '#15171c', textColor: '#d9b56a', pattern: 'split' },
  { id: 'zumrad', name: 'Zumrad', primaryColor: '#0c3d3a', secondaryColor: '#3fe0b0', textColor: '#f4f2fb', pattern: 'geo' },
  { id: 'tun', name: 'Tun', primaryColor: '#141a3c', secondaryColor: '#e8b84a', textColor: '#e8b84a', pattern: 'hoops' },
  { id: 'olov', name: 'Olov', primaryColor: '#a3122b', secondaryColor: '#f3efe8', textColor: '#ffffff', pattern: 'stripes' },
  { id: 'qor', name: 'Qor', primaryColor: '#eef0f4', secondaryColor: '#1d2c6e', textColor: '#1d2c6e', pattern: 'sash' },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export const isHexColor = (v) => typeof v === 'string' && HEX.test(v);

const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
const color = (v, fallback) => (isHexColor(v) ? v.toLowerCase() : fallback);
const url = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * Har qanday (qisman, eskirgan yoki noto'g'ri) dizaynni chizishga yaroqli holga keltiradi.
 * @param {Partial<KitDesign>|null|undefined} d
 * @returns {KitDesign}
 */
export function normalizeDesign(d) {
  const src = d && typeof d === 'object' ? d : {};
  const D = DEFAULT_KIT_DESIGN;
  return {
    name: typeof src.name === 'string' ? src.name : D.name,
    primaryColor: color(src.primaryColor, D.primaryColor),
    secondaryColor: color(src.secondaryColor, D.secondaryColor),
    textColor: color(src.textColor, D.textColor),
    pattern: pick(src.pattern, KIT_PATTERNS, D.pattern),
    neck: pick(src.neck, KIT_NECKS, D.neck),
    sponsorText: typeof src.sponsorText === 'string' ? src.sponsorText.slice(0, 20) : D.sponsorText,
    crestImageUrl: url(src.crestImageUrl),
    sponsorImageUrl: url(src.sponsorImageUrl),
    modelGlbUrl: url(src.modelGlbUrl),
  };
}

/**
 * Orqadagi ism va raqam: ism katta harf bilan, 12 belgigacha; raqam 0–99 (bo'sh — raqamsiz).
 * @param {{ backName?: string, number?: string|number|null }} [print]
 */
export function normalizePrint(print) {
  const p = print || {};
  const backName = String(p.backName ?? '').trim().toUpperCase().slice(0, BACK_NAME_MAX);
  const digits = String(p.number ?? '').replace(/\D/g, '').slice(0, 2);
  return { backName, number: digits === '' ? '' : String(Number(digits)) };
}
