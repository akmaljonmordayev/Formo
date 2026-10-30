/**
 * Forma 360° — 10 klub/terma jamoaning haqiqiy 8 burchakli fotosuratlari (admin: Superadmin → Forma 360°,
 * mobil: "Klub formasi" studiyasi). `Club.kit360Id` klubni aynan shu suratlar to'plamiga bog'laydi.
 *
 * Bu ro'yxat yagona manba: backfill skripti, katalog importi, admin DTO va testlar shundan oladi.
 * Mobil ilovadagi zaxira moslash (mobile/src/features/kit360) ham shu variantlar bilan bir xil.
 */
export const KIT360_IDS = ['es', 'ar', 'fr', 'en', 'pt', 'rm', 'fcb', 'mu', 'psg', 'mci'] as const;
export type Kit360Id = (typeof KIT360_IDS)[number];

/** id → klub nomi/kodining variantlari (kichik harfda: lotin, kirill, inglizcha, qisqa kod) */
export const KIT360_ALIASES: Record<Kit360Id, readonly string[]> = {
  es: ['ispaniya', 'испания', 'spain', 'espana', 'españa'],
  ar: ['argentina', 'аргентина'],
  fr: ['fransiya', 'франция', 'france'],
  en: ['angliya', 'англия', 'england'],
  pt: ['portugaliya', 'португалия', 'portugal'],
  rm: ['real madrid', 'реал мадрид', 'real', 'rma', 'rm'],
  fcb: ['barselona', 'барселона', 'barcelona', 'fc barcelona', 'fcb', 'bar'],
  mu: ['manchester yunayted', 'манчестер юнайтед', 'manchester united', 'man united', 'man utd', 'mu', 'mun'],
  psg: ['psj', 'псж', 'psg', 'paris saint-germain', 'paris saint germain', 'paris sg'],
  mci: ['manchester siti', 'манчестер сити', 'manchester city', 'man city', 'mci'],
};

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
