/**
 * Forma 360° (admin paneldagi Superadmin → Forma 360° bilan bir xil): 10 klub/terma jamoaning haqiqiy
 * 8 burchakli fotosuratlari. Katalogdagi klub shu ro'yxatda bo'lsa — studiyada 3D o'rniga foto-360° ko'rsatiladi.
 */
export const KIT360_SOURCE = 'formo-kit360';

// Viewer'dagi jamoa id → klub nomlarining variantlari (lotin, kirill, inglizcha, qisqa kod)
const ALIASES = {
  es: ['ispaniya', 'испания', 'spain', 'espana', 'españa'],
  ar: ['argentina', 'аргентина'],
  fr: ['fransiya', 'франция', 'france'],
  en: ['angliya', 'англия', 'england'],
  pt: ['portugaliya', 'португалия', 'portugal'],
  rm: ['real madrid', 'реал мадрид', 'real', 'rma'],
  fcb: ['barselona', 'барселона', 'barcelona', 'fc barcelona', 'fcb', 'bar'],
  mu: ['manchester yunayted', 'манчестер юнайтед', 'manchester united', 'man united', 'man utd', 'mu', 'mun'],
  psg: ['psj', 'псж', 'psg', 'paris saint-germain', 'paris saint germain', 'paris sg'],
  mci: ['manchester siti', 'манчестер сити', 'manchester city', 'man city', 'mci'],
};

const norm = (s) => String(s ?? '').toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();

/** Mahsulot (klub formasi) → viewer jamoa id'si yoki null (foto-360° yo'q — 3D ko'rinish qoladi) */
export function kit360Team(product) {
  const keys = [product?.clubName, product?.code, product?.name?.split(' · ')[0]].map(norm).filter(Boolean);
  for (const [id, names] of Object.entries(ALIASES)) {
    if (keys.some((k) => names.includes(k))) return id;
  }
  return null;
}

/** Ilova → viewer xabari (WebView.postMessage va iframe uchun matn) */
export function kit360Message({ team, name, number, side }) {
  return JSON.stringify({
    source: KIT360_SOURCE,
    type: 'update',
    team,
    name: String(name ?? ''),
    number: String(number ?? ''),
    side: side === 'front' ? 'front' : 'back',
  });
}

/** Viewer → ilova xabari; boshqa postMessage'lar uchun null */
export function parseKit360Message(raw) {
  try {
    const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return msg && msg.source === KIT360_SOURCE && typeof msg.type === 'string' ? msg : null;
  } catch {
    return null;
  }
}
