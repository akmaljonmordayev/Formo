/**
 * Manzil + koordinata yordamchilari (React/Expo'ga bog'liq emas — Node'da test qilinadi).
 * Chegaralar backend CreateAddressDto bilan bir xil:
 *   label 1–30, address 5–200, district ≤60, house ≤20, apartment ≤60, latitude/longitude — haqiqiy koordinata.
 */
import { isDistrictOf } from './districts';
import { TASHKENT_CENTER, TASHKENT_MAX_KM, distanceKm } from './tashkent';

export const ADDRESS_LIMITS = { label: 30, addressMin: 5, address: 200, district: 60, house: 20, apartment: 60 };

/** 12 viloyat + Qoraqalpog'iston Respublikasi + Toshkent shahri (alohida) — backend/src/shop/regions.ts bilan bir xil.
 *  Nomlar i18n'dan (`region_<code>`) — bu yerda faqat kodlar va tartib. */
export const REGION_CODES = [
  'TOSHKENT_SHAHRI',
  'TOSHKENT_VILOYATI',
  'ANDIJON',
  'BUXORO',
  'FARGONA',
  'JIZZAX',
  'XORAZM',
  'NAMANGAN',
  'NAVOIY',
  'QASHQADARYO',
  'SAMARQAND',
  'SIRDARYO',
  'SURXONDARYO',
  'QORAQALPOGISTON',
];

// Xarita birinchi ochilganda (GPS/saqlangan nuqta bo'lmasa) — Toshkent markazi
export const DEFAULT_CENTER = { latitude: 41.311081, longitude: 69.240562 };
export const CITY_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };
export const STREET_DELTA = { latitudeDelta: 0.006, longitudeDelta: 0.006 };

// O'zbekiston chegarasi (zaxirasi bilan) — pin boshqa davlatga qo'yilmasin
const UZ_BOUNDS = { south: 37.0, north: 45.7, west: 55.8, east: 73.3 };

const round6 = (n) => Math.round(n * 1e6) / 1e6;

export function isValidCoords(coords) {
  return (
    !!coords &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude) &&
    Math.abs(coords.latitude) <= 90 &&
    Math.abs(coords.longitude) <= 180
  );
}

/** Saqlangan manzilning koordinatasi (bo'lmasa null). */
export function addressCoords(address) {
  const coords = address && { latitude: address.latitude, longitude: address.longitude };
  return isValidCoords(coords) ? coords : null;
}

/**
 * Tanlangan nuqta viloyatga mos kelmasa — i18n kaliti, aks holda null.
 * Qat'iy tekshiruvlar: O'zbekiston ichida; "Toshkent shahri" tanlangan bo'lsa nuqta shahar atrofida
 * (server ham tekshiradi: backend/src/shop/tashkent.ts tashkentPointMismatch).
 */
export function pointProblem(region, coords) {
  if (!isValidCoords(coords)) return 'locationPickPoint';
  const { latitude, longitude } = coords;
  if (latitude < UZ_BOUNDS.south || latitude > UZ_BOUNDS.north || longitude < UZ_BOUNDS.west || longitude > UZ_BOUNDS.east) {
    return 'locationOutsideCountry';
  }
  if (region === 'TOSHKENT_SHAHRI' && distanceKm(latitude, longitude, TASHKENT_CENTER.latitude, TASHKENT_CENTER.longitude) > TASHKENT_MAX_KM) {
    return 'locationOutsideTashkent';
  }
  return null;
}

/**
 * expo-location reverseGeocodeAsync natijasi -> o'qiladigan manzil qatori.
 * Takrorlanuvchi bo'laklar (masalan, name === street) bir marta yoziladi.
 */
export function formatGeocode(place) {
  if (!place) return '';
  const street = [place.street, place.streetNumber].filter(Boolean).join(' ');
  const parts = [place.city || place.subregion, place.district, street || place.name];
  const seen = new Set();
  return parts
    .map((part) => String(part || '').trim())
    .filter((part) => part && !seen.has(part.toLowerCase()) && seen.add(part.toLowerCase()))
    .join(', ')
    .slice(0, ADDRESS_LIMITS.address);
}

/** "32" -> "32-uy"; so'z bilan yozilgan ("32-dom", "12-uy") — o'zgarishsiz. Server: addresses.service houseLabel */
export function houseLabel(house) {
  const h = String(house || '').trim();
  if (!h) return '';
  return /^\d+\s*[A-Za-zЀ-ӿ]?(\/\d+)?$/.test(h) ? `${h}-uy` : h;
}

/**
 * To'liq manzil bir qatorda: "Toshkent shahri, Sergeli tumani, Madadkor mahallasi, 32-uy, 45-xonadon".
 * `t` berilsa viloyat nomi joriy tilda. Matnda allaqachon bor bo'lak (tuman nomi) takrorlanmaydi.
 */
export function formatFullAddress(a, t) {
  if (!a) return '';
  const text = String(a.address || '');
  const lower = text.toLowerCase();
  const region = a.region && t ? t(`region_${a.region}`) : '';
  const lead = [region, a.district].filter((p) => p && !lower.includes(String(p).toLowerCase()));
  return [...lead, text, houseLabel(a.house), a.apartment].filter(Boolean).join(', ');
}

/** Forma qiymatlarini tekshiradi: { field: i18nKey } (bo'sh obyekt — xato yo'q). */
export function validateAddressForm({ label, address, apartment, region, district, house, coords }) {
  const errors = {};
  const l = String(label || '').trim();
  const a = String(address || '').trim();
  const h = String(house || '').trim();
  if (!l || l.length > ADDRESS_LIMITS.label) errors.label = 'addrLabelInvalid';
  if (a.length < ADDRESS_LIMITS.addressMin || a.length > ADDRESS_LIMITS.address) errors.address = 'addrTextInvalid';
  if (!h || h.length > ADDRESS_LIMITS.house) errors.house = 'addrHouseInvalid';
  if (String(apartment || '').trim().length > ADDRESS_LIMITS.apartment) errors.apartment = 'addrApartmentInvalid';
  if (/[<>]/.test(l + a + h + (apartment || ''))) errors.address = 'invalidValue';
  if (!region || !REGION_CODES.includes(region)) errors.region = 'addrRegionInvalid';
  else if (!isDistrictOf(region, district)) errors.district = 'addrDistrictInvalid';
  if (coords && !isValidCoords(coords)) errors.coords = 'locationInvalid';
  return errors;
}

/**
 * POST/PATCH /addresses tanasi — faqat DTO maydonlari. Bo'sh `apartment`
 * yuborilmaydi (create) yoki bo'sh satr bilan tozalanadi (update).
 */
export function toAddressPayload({ label, address, apartment, region, district, house, coords, isDefault }, { isUpdate = false } = {}) {
  const body = {
    label: String(label).trim(),
    address: String(address).trim().replace(/\s+/g, ' '),
  };
  const apt = String(apartment || '').trim();
  if (apt) body.apartment = apt;
  else if (isUpdate) body.apartment = '';
  if (region && REGION_CODES.includes(region)) {
    body.region = region;
    if (isDistrictOf(region, district)) body.district = district;
  }
  const h = String(house || '').trim();
  if (h) body.house = h;
  if (isValidCoords(coords)) {
    body.latitude = round6(coords.latitude);
    body.longitude = round6(coords.longitude);
  }
  if (typeof isDefault === 'boolean') body.isDefault = isDefault;
  return body;
}
