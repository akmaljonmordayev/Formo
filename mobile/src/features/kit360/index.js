/**
 * Forma 360° (admin paneldagi Superadmin → Forma 360° bilan bir xil): 18 klub/terma jamoaning haqiqiy
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
  uz: ["o'zbekiston", 'ozbekiston', 'uzbekistan', 'узбекистан', 'ўзбекистон', 'uzb', 'uz'],
  rm: ['real madrid', 'реал мадрид', 'real', 'rma'],
  fcb: ['barselona', 'барселона', 'barcelona', 'fc barcelona', 'fcb', 'bar'],
  mu: ['manchester yunayted', 'манчестер юнайтед', 'manchester united', 'man united', 'man utd', 'mu', 'mun'],
  psg: ['psj', 'псж', 'psg', 'paris saint-germain', 'paris saint germain', 'paris sg'],
  mci: ['manchester siti', 'манчестер сити', 'manchester city', 'man city', 'mci'],
  uz: ["o'zbekiston", 'ozbekiston', 'ўзбекистон', 'узбекистан', 'uzbekistan', 'uzb'],
  de: ['germaniya', 'германия', 'germany', 'deutschland', 'ger'],
  lfc: ['liverpul', 'ливерпуль', 'liverpool', 'liverpool fc', 'lfc', 'liv'],
  ars: ['arsenal', 'арсенал', 'arsenal fc', 'ars'],
  che: ['chelsi', 'челси', 'chelsea', 'chelsea fc', 'che'],
  juv: ['yuventus', 'ювентус', 'juventus', 'juve', 'juv'],
  rom: ['roma', 'рома', 'as roma', 'rom'],
  atm: ['atletiko madrid', 'атлетико мадрид', 'atletico madrid', 'atlético madrid', 'atletico', 'atm'],
};

const norm = (s) => String(s ?? '').toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();

export const KIT360_IDS = Object.keys(ALIASES);

/** 18 ta Forma 360° jamoalari — admin paneldagi Superadmin → Forma 360° bilan bir xil */
export const KIT360_TEAMS = [
  { id: 'es', kind: 'national', name: 'Ispaniya', code: 'ESP', color: '#c60b1e', accent: '#f6c23e', colorsLabel: 'Qizil / sariq' },
  { id: 'ar', kind: 'national', name: 'Argentina', code: 'ARG', color: '#75aadb', accent: '#111318', colorsLabel: 'Oq / havorang' },
  { id: 'fr', kind: 'national', name: 'Fransiya', code: 'FR', color: '#1f2a5c', accent: '#ffffff', colorsLabel: "To'q ko'k / oq" },
  { id: 'en', kind: 'national', name: 'Angliya', code: 'EN', color: '#ffffff', accent: '#1b2450', colorsLabel: "Oq / to'q ko'k" },
  { id: 'pt', kind: 'national', name: 'Portugaliya', code: 'PT', color: '#a6192e', accent: '#f3c74a', colorsLabel: 'Qizil / yashil' },
  { id: 'uz', kind: 'national', name: "O'zbekiston", code: 'UZB', color: '#1e3a8a', accent: '#ffffff', colorsLabel: "Ko'k / oq" },
  { id: 'de', kind: 'national', name: 'Germaniya', code: 'GER', color: '#ffffff', accent: '#111318', colorsLabel: 'Oq / qora' },
  { id: 'rm', kind: 'club', name: 'Real Madrid', code: 'RMA', color: '#ffffff', accent: '#1b2450', colorsLabel: "Oq / to'q ko'k" },
  { id: 'fcb', kind: 'club', name: 'Barselona', code: 'FCB', color: '#1d3f8f', accent: '#f2c12e', colorsLabel: "Ko'k / to'q qizil" },
  { id: 'mu', kind: 'club', name: 'Manchester Yunayted', code: 'MU', color: '#da291c', accent: '#ffffff', colorsLabel: 'Qizil / oq' },
  { id: 'psg', kind: 'club', name: 'PSJ', code: 'PSG', color: '#1b2450', accent: '#ffffff', colorsLabel: "To'q ko'k / qizil" },
  { id: 'mci', kind: 'club', name: 'Manchester Siti', code: 'MCI', color: '#6cabdd', accent: '#1b2450', colorsLabel: 'Havorang / oq' },
  { id: 'lfc', kind: 'club', name: 'Liverpul', code: 'LFC', color: '#c8102e', accent: '#ffffff', colorsLabel: 'Qizil / oq' },
  { id: 'ars', kind: 'club', name: 'Arsenal', code: 'ARS', color: '#ef0107', accent: '#ffffff', colorsLabel: 'Qizil / oq' },
  { id: 'che', kind: 'club', name: 'Chelsi', code: 'CHE', color: '#034694', accent: '#ffffff', colorsLabel: "Ko'k / oq" },
  { id: 'juv', kind: 'club', name: 'Yuventus', code: 'JUV', color: '#111318', accent: '#ffffff', colorsLabel: 'Qora / oq' },
  { id: 'rom', kind: 'club', name: 'Roma', code: 'ROM', color: '#8e1f2f', accent: '#f7b731', colorsLabel: "To'q qizil / sariq" },
  { id: 'atm', kind: 'club', name: 'Atletiko Madrid', code: 'ATM', color: '#cb3524', accent: '#ffffff', colorsLabel: 'Qizil / oq' },
];

/**
 * Mahsulot (klub formasi) → viewer jamoa id'si yoki null (foto-360° yo'q — 3D ko'rinish qoladi).
 * Avval backend'dagi aniq bog'lanish (product.kit360Id): id — shu suratlar, null — admin bog'lamagan (3D).
 * Maydon umuman yo'q bo'lsa (eski API) — nom/kod bo'yicha moslash zaxira sifatida.
 */
export function kit360Team(product) {
  if (product?.kit360Id !== undefined) return KIT360_IDS.includes(product.kit360Id) ? product.kit360Id : null;
  const keys = [product?.clubName, product?.code, product?.name?.split(' · ')[0]].map(norm).filter(Boolean);
  for (const [id, names] of Object.entries(ALIASES)) {
    if (keys.some((k) => names.includes(k))) return id;
  }
  return null;
}

/**
 * Savat/buyurtma qatori → jamoa id (karta surati uchun) yoki null.
 * Savat: item.club.kit360Id; buyurtma: item.kit360Id (buyurtma paytidagi bog'lanish).
 */
export function itemKit360(item) {
  const id = item?.club?.kit360Id ?? item?.kit360Id ?? null;
  return KIT360_IDS.includes(id) ? id : null;
}

/** Ilova → viewer xabari (WebView.postMessage va iframe uchun matn) */
export function kit360Message({ team, name, number, shortsNumber, side }) {
  return JSON.stringify({
    source: KIT360_SOURCE,
    type: 'update',
    team,
    name: String(name ?? ''),
    number: String(number ?? ''),
    // Berilmasa (undefined) — viewer shortikka orqadagi raqamni chizadi; '' — shortik raqamsiz
    ...(shortsNumber !== undefined && shortsNumber !== null && { shortsNumber: String(shortsNumber) }),
    // 'side' — viewer o'zi yonga burilgan (90°/270°): tomon buyrug'i yuborilmaydi, forma joyida qoladi
    side: side === 'front' ? 'front' : side === 'side' ? null : 'back',
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

export function findKit360Team(id) {
  return KIT360_TEAMS.find((t) => t.id === id) || KIT360_TEAMS[0];
}

