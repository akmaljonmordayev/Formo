/**
 * Forma 360° — 18 klub/terma jamoaning (7 terma, 11 klub) haqiqiy 8 burchakli fotosuratlari (admin: Superadmin → Forma 360°,
 * mobil: "Klub formasi" studiyasi). `Club.kit360Id` klubni aynan shu suratlar to'plamiga bog'laydi.
 *
 * Bu ro'yxat yagona manba: backfill skripti, katalog importi, admin DTO va testlar shundan oladi.
 * Mobil ilovadagi zaxira moslash (mobile/src/features/kit360) ham shu variantlar bilan bir xil.
 */
export const KIT360_IDS = [
  'es', 'ar', 'fr', 'en', 'pt', 'uz', 'de',
  'rm', 'fcb', 'mu', 'psg', 'mci', 'lfc', 'ars', 'che', 'juv', 'rom', 'atm',
] as const;
export type Kit360Id = (typeof KIT360_IDS)[number];

/**
 * Uzun yeng + shalvar suratlari (frames/<id>/l0..l7) bor jamoalar — mobil ilovada "Uzun yeng (qishki)" formasi.
 * Ro'yxat frontend/src/pages/Superadmin/Kit360/frames va mobile/src/features/kit360 (KIT360_LONG) bilan bir xil.
 */
export const KIT360_LONG_IDS: readonly Kit360Id[] = ['es', 'ar', 'fr', 'en', 'pt', 'uz', 'de', 'rm', 'fcb', 'mu', 'psg', 'mci'];

/** id → klub nomi/kodining variantlari (kichik harfda: lotin, kirill, inglizcha, qisqa kod) */
export const KIT360_ALIASES: Record<Kit360Id, readonly string[]> = {
  es: ['ispaniya', 'испания', 'spain', 'espana', 'españa'],
  ar: ['argentina', 'аргентина'],
  fr: ['fransiya', 'франция', 'france'],
  en: ['angliya', 'англия', 'england'],
  pt: ['portugaliya', 'португалия', 'portugal'],
  uz: ["o'zbekiston", 'ozbekiston', 'uzbekistan', 'узбекистан', 'ўзбекистон', 'uzb', 'uz'],
  de: ['germaniya', 'германия', 'germany', 'deutschland', 'ger'],
  rm: ['real madrid', 'реал мадрид', 'real', 'rma', 'rm'],
  fcb: ['barselona', 'барселона', 'barcelona', 'fc barcelona', 'fcb', 'bar'],
  mu: ['manchester yunayted', 'манчестер юнайтед', 'manchester united', 'man united', 'man utd', 'mu', 'mun'],
  psg: ['psj', 'псж', 'psg', 'paris saint-germain', 'paris saint germain', 'paris sg'],
  mci: ['manchester siti', 'манчестер сити', 'manchester city', 'man city', 'mci'],
  lfc: ['liverpul', 'ливерпуль', 'liverpool', 'liverpool fc', 'lfc', 'liv'],
  ars: ['arsenal', 'арсенал', 'arsenal fc', 'ars'],
  che: ['chelsi', 'челси', 'chelsea', 'chelsea fc', 'che'],
  juv: ['yuventus', 'ювентус', 'juventus', 'juve', 'juv'],
  rom: ['roma', 'рома', 'as roma', 'rom'],
  atm: ['atletiko madrid', 'атлетико мадрид', 'atletico madrid', 'atlético madrid', 'atletico', 'atm'],
};

/**
 * Katalogda Forma 360° jamoasi umuman bo'lmasa — ilova ishga tushganda shu ma'lumot bilan klub va "Uy" formasi
 * yaratiladi (src/kits/kit360-catalog.seed.ts). Narxlar Kit modeli standartlari; admin keyin o'zgartira oladi.
 */
export interface Kit360CatalogTeam {
  id: Kit360Id;
  name: string;
  code: string;
  national: boolean;
  continent?: 'EUROPE' | 'ASIA' | 'AMERICA';
  category: { name: string; slug: string };
  markColor: string;
  bgColor: string;
  textColor: string;
  colorsLabel: string;
}

const NATIONAL_EU = { name: 'Yevropa terma jamoalari', slug: 'yevropa-terma-jamoalari' };
const NATIONAL_AM = { name: 'Amerika terma jamoalari', slug: 'amerika-terma-jamoalari' };
const NATIONAL_AS = { name: 'Osiyo terma jamoalari', slug: 'osiyo-terma-jamoalari' };
const LALIGA = { name: 'LaLiga', slug: 'laliga' };
const EPL = { name: 'Premier League', slug: 'premier-league' };
const LIGUE1 = { name: 'Ligue 1', slug: 'ligue-1' };
const SERIEA = { name: 'Serie A', slug: 'serie-a' };

export const KIT360_CATALOG: readonly Kit360CatalogTeam[] = [
  { id: 'es', name: 'Ispaniya', code: 'ES', national: true, continent: 'EUROPE', category: NATIONAL_EU, markColor: '#c60b1e', bgColor: '#c60b1e', textColor: '#f6c23e', colorsLabel: 'Qizil / sariq' },
  { id: 'ar', name: 'Argentina', code: 'AR', national: true, continent: 'AMERICA', category: NATIONAL_AM, markColor: '#75aadb', bgColor: '#75aadb', textColor: '#111318', colorsLabel: 'Oq / havorang' },
  { id: 'fr', name: 'Fransiya', code: 'FR', national: true, continent: 'EUROPE', category: NATIONAL_EU, markColor: '#1f2a5c', bgColor: '#1f2a5c', textColor: '#ffffff', colorsLabel: "To'q ko'k / oq" },
  { id: 'en', name: 'Angliya', code: 'EN', national: true, continent: 'EUROPE', category: NATIONAL_EU, markColor: '#1b2450', bgColor: '#ffffff', textColor: '#1b2450', colorsLabel: "Oq / to'q ko'k" },
  { id: 'pt', name: 'Portugaliya', code: 'PT', national: true, continent: 'EUROPE', category: NATIONAL_EU, markColor: '#a6192e', bgColor: '#a6192e', textColor: '#f3c74a', colorsLabel: 'Qizil / yashil' },
  { id: 'uz', name: "O'zbekiston", code: 'UZ', national: true, continent: 'ASIA', category: NATIONAL_AS, markColor: '#0072ce', bgColor: '#ffffff', textColor: '#0072ce', colorsLabel: "Oq / ko'k" },
  { id: 'de', name: 'Germaniya', code: 'DE', national: true, continent: 'EUROPE', category: NATIONAL_EU, markColor: '#111318', bgColor: '#ffffff', textColor: '#111318', colorsLabel: 'Oq / qora' },
  { id: 'rm', name: 'Real Madrid', code: 'RM', national: false, category: LALIGA, markColor: '#1b2450', bgColor: '#ffffff', textColor: '#1b2450', colorsLabel: "Oq / to'q ko'k" },
  { id: 'fcb', name: 'Barselona', code: 'FCB', national: false, category: LALIGA, markColor: '#a50044', bgColor: '#1d3f8f', textColor: '#f2c12e', colorsLabel: "Ko'k / to'q qizil" },
  { id: 'mu', name: 'Manchester Yunayted', code: 'MU', national: false, category: EPL, markColor: '#da291c', bgColor: '#da291c', textColor: '#ffffff', colorsLabel: 'Qizil / oq' },
  { id: 'psg', name: 'PSJ', code: 'PSG', national: false, category: LIGUE1, markColor: '#004170', bgColor: '#1b2450', textColor: '#ffffff', colorsLabel: "To'q ko'k / qizil" },
  { id: 'mci', name: 'Manchester Siti', code: 'MCI', national: false, category: EPL, markColor: '#6cabdd', bgColor: '#6cabdd', textColor: '#1b2450', colorsLabel: 'Havorang / oq' },
  { id: 'lfc', name: 'Liverpul', code: 'LFC', national: false, category: EPL, markColor: '#c8102e', bgColor: '#c8102e', textColor: '#ffffff', colorsLabel: 'Qizil / oq' },
  { id: 'ars', name: 'Arsenal', code: 'ARS', national: false, category: EPL, markColor: '#ef0107', bgColor: '#ef0107', textColor: '#ffffff', colorsLabel: 'Qizil / oq' },
  { id: 'che', name: 'Chelsi', code: 'CHE', national: false, category: EPL, markColor: '#034694', bgColor: '#034694', textColor: '#ffffff', colorsLabel: "Ko'k / oq" },
  { id: 'juv', name: 'Yuventus', code: 'JUV', national: false, category: SERIEA, markColor: '#111318', bgColor: '#111318', textColor: '#ffffff', colorsLabel: 'Qora / oq' },
  { id: 'rom', name: 'Roma', code: 'ROM', national: false, category: SERIEA, markColor: '#8e1f2f', bgColor: '#8e1f2f', textColor: '#f7b731', colorsLabel: "To'q qizil / sariq" },
  { id: 'atm', name: 'Atletiko Madrid', code: 'ATM', national: false, category: LALIGA, markColor: '#cb3524', bgColor: '#cb3524', textColor: '#ffffff', colorsLabel: 'Qizil / oq' },
];

const norm = (s: string | null | undefined) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[‘’ʻʼ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export const isKit360Id = (value: unknown): value is Kit360Id => (KIT360_IDS as readonly string[]).includes(value as string);

/** Klub nomi yoki kodi bo'yicha Forma 360° id'si; topilmasa null (klub 3D ko'rinishda qoladi) */
export function kit360IdFor(name: string | null | undefined, code?: string | null): Kit360Id | null {
  const keys = [norm(name), norm(code)].filter(Boolean);
  for (const id of KIT360_IDS) {
    if (keys.some((k) => KIT360_ALIASES[id].includes(k))) return id;
  }
  return null;
}

export interface Kit360Candidate {
  id: number;
  name: string;
  code: string;
  season: string;
  isActive: boolean;
  kit360Id: string | null;
}

/**
 * Backfill: har bo'sh id uchun bog'lanmagan klublar ichidan egasini tanlaydi — avval faol, keyin eng yangi
 * mavsum, keyin kichik id. Band id'lar va allaqachon bog'langan klublarga tegilmaydi.
 */
export function pickKit360Owners<T extends Kit360Candidate>(rows: T[]): Map<Kit360Id, T> {
  const taken = new Set(rows.map((r) => r.kit360Id).filter(Boolean));
  const out = new Map<Kit360Id, T>();
  for (const id of KIT360_IDS) {
    if (taken.has(id)) continue;
    const candidates = rows
      .filter((r) => !r.kit360Id && kit360IdFor(r.name, r.code) === id)
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.season.localeCompare(a.season) || a.id - b.id);
    if (candidates[0]) out.set(id, candidates[0]);
  }
  return out;
}
