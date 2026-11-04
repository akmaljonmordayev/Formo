/**
 * Toshkent shahri chegarasi (taxminiy ko'pburchak, [kenglik, uzunlik]). Naqd to'lov faqat shahar ichiga
 * yetkazishda ruxsat etiladi; shahardan tashqariga — faqat shaxsiy hisob (balans) orqali.
 * Mobil ilovadagi nusxa: mobile/src/features/location/tashkent.js — ikkalasi bir xil bo'lsin.
 */
export const TASHKENT_CITY_POLYGON: ReadonlyArray<readonly [number, number]> = [
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

/** Nuqta Toshkent shahri ichidami (ray casting). Koordinata yo'q — false (shahar ichi deb hisoblanmaydi) */
export function inTashkentCity(lat: number | null | undefined, lng: number | null | undefined): boolean {
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
