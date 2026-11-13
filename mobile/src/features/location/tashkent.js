/**
 * Toshkent shahri chegarasi (taxminiy ko'pburchak, [kenglik, uzunlik]). Naqd to'lov faqat shahar ichiga
 * yetkazishda; shahardan tashqariga — faqat shaxsiy hisobdan. Server ham tekshiradi:
 * backend/src/shop/tashkent.ts — ikkalasi bir xil bo'lsin.
 */
export const TASHKENT_CITY_POLYGON = [
  [41.395, 69.155],
  [41.418, 69.235],
  [41.405, 69.33],
  [41.375, 69.4],
  [41.33, 69.43],
  [41.27, 69.42],
  [41.215, 69.37],
  [41.19, 69.3],
  [41.205, 69.2],
  [41.245, 69.13],
  [41.31, 69.115],
  [41.36, 69.125],
];

/** Nuqta Toshkent shahri ichidami. Koordinata yo'q — false */
export function inTashkentCity(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  let inside = false;
  const poly = TASHKENT_CITY_POLYGON;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Toshkent shahri markazi (Amir Temur xiyoboni) va shahar chetigacha bo'lgan zaxirali radius */
export const TASHKENT_CENTER = { latitude: 41.311081, longitude: 69.240562 };
export const TASHKENT_MAX_KM = 30;

/** Ikki nuqta orasidagi masofa, km (haversine) */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Pochta orqali yetkazish (viloyatlar): kun/vaqt tanlanmaydi, buyurtma pochta bo'limigacha boradi.
 * Viloyat ko'rsatilgan — shundan; eski manzilda viloyat yo'q — xarita nuqtasidan; ikkalasi ham yo'q — kuryer.
 * Server: backend/src/shop/tashkent.ts isPostalDelivery — ikkalasi bir xil bo'lsin.
 */
export function isPostalDelivery(address) {
  if (!address) return false;
  if (address.region) return address.region !== 'TOSHKENT_SHAHRI';
  const hasPoint = typeof address.latitude === 'number' && typeof address.longitude === 'number';
  return hasPoint && !inTashkentCity(address.latitude, address.longitude);
}
