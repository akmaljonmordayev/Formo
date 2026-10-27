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
export const SPONSOR_TEXT_MAX = 20;
export const BACK_TOP_TEXT_MAX = 20;

/** Saqlanadigan dizayn shakli versiyasi: admin, backend va mobil aynan shu obyektni o'qiydi */
export const KIT_DESIGN_VERSION = 1;

/**
 * @typedef {Object} KitDesign
 * @property {number} designVersion  KIT_DESIGN_VERSION
 * @property {string} [name]
 * @property {string} primaryColor   asosiy rang, #rrggbb
 * @property {string} secondaryColor naqsh/yenglar rangi, #rrggbb
 * @property {string} textColor      yozuvlar rangi, #rrggbb
 * @property {string} pattern        KIT_PATTERNS dan biri
 * @property {string} neck           'round' | 'v'
 * @property {string} [sponsorText]  oldidagi homiy yozuvi
 * @property {string} [backTopText]  orqa tepasidagi kichik yozuv (masalan jamoa nomi)
 * @property {string|null} [crestImageUrl]
 * @property {string|null} [sponsorImageUrl]
 */

/** @type {KitDesign} */
export const DEFAULT_KIT_DESIGN = Object.freeze({
  designVersion: KIT_DESIGN_VERSION,
  name: '',
  primaryColor: '#1f6f8b',
  secondaryColor: '#0b1d2a',
  textColor: '#e3c27a',
  pattern: 'fade',
  neck: 'round',
  sponsorText: '',
  backTopText: '',
  crestImageUrl: null,
  sponsorImageUrl: null,
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
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Har qanday (qisman, eskirgan yoki noto'g'ri) dizaynni chizishga yaroqli holga keltiradi.
 * @param {Partial<KitDesign>|null|undefined} d
 * @returns {KitDesign}
 */
export function normalizeDesign(d) {
  const src = d && typeof d === 'object' ? d : {};
  const D = DEFAULT_KIT_DESIGN;
  // Kelajakdagi versiyalar shu yerda v1 ga o'giriladi; hozircha faqat v1 bor
  return {
    designVersion: KIT_DESIGN_VERSION,
    name: typeof src.name === 'string' ? src.name : D.name,
    primaryColor: color(src.primaryColor, D.primaryColor),
    secondaryColor: color(src.secondaryColor, D.secondaryColor),
    textColor: color(src.textColor, D.textColor),
    pattern: pick(src.pattern, KIT_PATTERNS, D.pattern),
    neck: pick(src.neck, KIT_NECKS, D.neck),
    sponsorText: text(src.sponsorText, SPONSOR_TEXT_MAX),
    backTopText: text(src.backTopText, BACK_TOP_TEXT_MAX),
    crestImageUrl: url(src.crestImageUrl),
    sponsorImageUrl: url(src.sponsorImageUrl),
  };
}

/**
 * Orqadagi ism va raqam: ism katta harf bilan, 12 belgigacha; raqam 0–99 (bo'sh — raqamsiz).
 * Mobil studiya qo'shimchalari: glow — neon yozuv, patch — yengdagi yamoq belgisi ("C", "UZ", "★").
 * @param {{ backName?: string, number?: string|number|null, glow?: boolean, patch?: string|null }} [print]
 */
export function normalizePrint(print) {
  const p = print || {};
  const backName = String(p.backName ?? '').trim().toUpperCase().slice(0, BACK_NAME_MAX);
  const digits = String(p.number ?? '').replace(/\D/g, '').slice(0, 2);
  const patch = typeof p.patch === 'string' && p.patch.trim() ? p.patch.trim().slice(0, 3) : null;
  return { backName, number: digits === '' ? '' : String(Number(digits)), glow: p.glow === true, patch };
}
