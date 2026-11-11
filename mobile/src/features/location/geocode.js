/**
 * Manzil qidiruvi va nuqtadan manzil aniqlash — OpenStreetMap Nominatim (kalit kerak emas).
 * Qurilma geokoderi O'zbekistonda mahalla/uy darajasida zaif, shuning uchun asosiy manba shu;
 * tarmoq xatosida chaqiruvchi (features/location) qurilma geokoderiga qaytadi.
 *
 * Nominatim qoidalari: sekundiga ko'pi bilan 1 so'rov, har bosilgan harfda emas — faqat foydalanuvchi
 * "qidirish"ni bosganda yoki pin to'xtaganda. Serverga faqat qidiruv matni/nuqta yuboriladi
 * (foydalanuvchi ma'lumoti yo'q).
 */
const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'uz,ru;q=0.7,en;q=0.5',
  'User-Agent': 'FormoApp/1.0 (mobile address picker)',
};
const TIMEOUT_MS = 8000;
const MIN_GAP_MS = 1100;

// So'rovlar navbat bilan, orasida kamida 1.1 s
let queue = Promise.resolve();
let lastAt = 0;
function throttled(run) {
  const next = queue.then(async () => {
    const wait = lastAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await run();
    } finally {
      lastAt = Date.now();
    }
  });
  queue = next.catch(() => {});
  return next;
}

/** Testlar uchun: navbat va oxirgi so'rov vaqtini tozalaydi */
export function resetGeocodeThrottle() {
  queue = Promise.resolve();
  lastAt = 0;
}

const query = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

async function getJson(path, params) {
  return throttled(async () => {
    const controller = typeof AbortController === 'undefined' ? null : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
    try {
      const res = await fetch(`${BASE}${path}?${query({ format: 'jsonv2', ...params })}`, {
        method: 'GET',
        headers: HEADERS,
        signal: controller?.signal,
      });
      if (!res.ok) throw new Error(`geocode ${res.status}`);
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Tuman chegarasi o'rniga bitta nuqta (tuman markazi) topilsa — shu atrofdagi taxminiy kenglik
const POINT_DELTA = 0.3;
const MIN_SPAN = 0.02;
const MAX_SPAN = 4;

/**
 * Nominatim boundingbox [janub, shimol, g'arb, sharq] -> xarita hududi (biroz chetlari bilan).
 * Juda kichik quti (nuqta) — markaz atrofidagi taxminiy hudud; haddan tashqari katta quti — yaroqsiz (null).
 */
export function boxToArea(box, lat, lon) {
  const [s, n, w, e] = (box || []).map(num);
  if (![s, n, w, e].every(Number.isFinite)) return null;
  const latSpan = n - s;
  const lonSpan = e - w;
  if (latSpan > MAX_SPAN || lonSpan > MAX_SPAN) return null;
  const point = latSpan < MIN_SPAN && lonSpan < MIN_SPAN;
  return {
    latitude: point ? (lat ?? (s + n) / 2) : (s + n) / 2,
    longitude: point ? (lon ?? (w + e) / 2) : (w + e) / 2,
    latitudeDelta: point ? POINT_DELTA : latSpan * 1.15,
    longitudeDelta: point ? POINT_DELTA : lonSpan * 1.15,
  };
}

/** Nuqta hudud ichidami (chetlari biroz kengroq olinadi) */
export function isInside(area, point) {
  const lat = (area.latitudeDelta / 2) * 1.25;
  const lon = (area.longitudeDelta / 2) * 1.25;
  return Math.abs(point.latitude - area.latitude) <= lat && Math.abs(point.longitude - area.longitude) <= lon;
}

const areaCache = new Map();

/** Tuman/shahar hududi: "Chilonzor tumani, Toshkent shahri" -> { latitude, longitude, ...Delta } | null */
export async function lookupArea(text) {
  const key = String(text || '').trim();
  if (!key) return null;
  if (areaCache.has(key)) return areaCache.get(key);
  const rows = await getJson('/search', { q: `${key}, O'zbekiston`, countrycodes: 'uz', limit: 1 });
  const hit = Array.isArray(rows) ? rows[0] : null;
  const area = hit ? boxToArea(hit.boundingbox, num(hit.lat), num(hit.lon)) : null;
  if (area) areaCache.set(key, area);
  return area;
}

/** "Madadkor MFY, Sergeli tumani, Toshkent, 100000, O'zbekiston" -> { title, subtitle } */
export function splitDisplayName(displayName) {
  const parts = String(displayName || '')
    .split(',')
    .map((p) => p.trim())
    // Pochta indeksi va davlat nomi ro'yxatda ortiqcha
    .filter((p) => p && !/^\d{5,6}$/.test(p) && !/^(o[‘'ʻ`]?zbekiston|uzbekistan|узбекистан|ўзбекистон)$/i.test(p));
  return { title: parts.slice(0, 2).join(', '), subtitle: parts.slice(2, 5).join(', ') };
}

const toHit = (row) => {
  const latitude = num(row.lat);
  const longitude = num(row.lon);
  if (latitude === null || longitude === null) return null;
  return { id: String(row.place_id ?? `${latitude},${longitude}`), latitude, longitude, ...splitDisplayName(row.display_name) };
};

/**
 * Matn bo'yicha qidiruv, tanlangan tumandan boshlab kengayib boradi:
 *   1) "Madadkor mahallasi, Sergeli tumani, Toshkent shahri" (tuman nomi bilan);
 *   2) faqat tuman hududi ichida (viewbox, qat'iy chegara);
 *   3) `fallback(q)` — chaqiruvchi bergan zaxira manba (qurilma geokoderi);
 *   4) viloyat bo'yicha (`region` — "Toshkent shahri").
 * `bounds` (viloyat hududi) berilsa — undan tashqaridagi natijalar tashlanadi: Sergeli tumanida qidirilgan
 * "Madadkor" Farg'onadagi Madadkor mahallasini ko'rsatmasin (topilmasa — mijoz nuqtani xaritada o'zi qo'yadi).
 * Natija: [{ id, title, subtitle, latitude, longitude }] (6 tagacha); birinchi natija bergan bosqichda to'xtaydi.
 */
export async function searchPlaces(text, { context, area, fallback, region, bounds } = {}) {
  const q = String(text || '').trim();
  if (q.length < 3) return [];
  const base = { countrycodes: 'uz', limit: 6, addressdetails: 0 };
  // viewbox: g'arb,shimol,sharq,janub
  const viewbox = area
    ? [
        area.longitude - area.longitudeDelta / 2,
        area.latitude + area.latitudeDelta / 2,
        area.longitude + area.longitudeDelta / 2,
        area.latitude - area.latitudeDelta / 2,
      ].join(',')
    : undefined;
  const inside = (h) => !bounds || isInside(bounds, h);
  const hits = (rows) => (Array.isArray(rows) ? rows : []).map(toHit).filter((h) => h && inside(h));

  const stages = [
    context ? () => getJson('/search', { ...base, q: `${q}, ${context}`, viewbox }).then(hits) : null,
    viewbox ? () => getJson('/search', { ...base, q, viewbox, bounded: 1 }).then(hits) : null,
    fallback ? () => fallback(q).then((list) => (list || []).filter(inside)) : null,
    () => getJson('/search', { ...base, q: region ? `${q}, ${region}` : q }).then(hits),
  ].filter(Boolean);

  let lastError = null;
  for (const stage of stages) {
    try {
      const found = await stage();
      if (found?.length) return found;
    } catch (err) {
      // Bitta manba ishlamasa keyingisi sinaladi; hammasi xato bersa — oxirgi xato chaqiruvchiga
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return [];
}

const uniq = (parts) => {
  const seen = new Set();
  return parts
    .map((p) => String(p || '').trim())
    .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
};

/** Nominatim `address` -> { text: "Madadkor mahallasi, Yangi Sergeli ko'chasi", house: "32" } */
export function formatReverse(address) {
  if (!address) return { text: '', house: '' };
  const mahalla = address.neighbourhood || address.quarter || address.residential || address.hamlet || address.village;
  const street = address.road || address.pedestrian || address.footway;
  return { text: uniq([mahalla, street]).join(', '), house: String(address.house_number || '').trim() };
}

/** Nuqta -> { text, house } (hech narsa aniqlanmasa — bo'sh satrlar) */
export async function reversePlace({ latitude, longitude }) {
  const data = await getJson('/reverse', { lat: latitude, lon: longitude, zoom: 18, addressdetails: 1 });
  return formatReverse(data?.address);
}
