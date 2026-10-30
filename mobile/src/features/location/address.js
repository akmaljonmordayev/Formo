/**
 * Manzil + koordinata yordamchilari (React/Expo'ga bog'liq emas — Node'da test qilinadi).
 * Chegaralar backend CreateAddressDto bilan bir xil:
 *   label 1–30, address 5–200, apartment ≤60, latitude/longitude — haqiqiy koordinata.
 */
export const ADDRESS_LIMITS = { label: 30, addressMin: 5, address: 200, apartment: 60 };

// Xarita birinchi ochilganda (GPS/saqlangan nuqta bo'lmasa) — Toshkent markazi
export const DEFAULT_CENTER = { latitude: 41.311081, longitude: 69.240562 };
export const CITY_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };
export const STREET_DELTA = { latitudeDelta: 0.006, longitudeDelta: 0.006 };

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

/** Forma qiymatlarini tekshiradi: { field: i18nKey } (bo'sh obyekt — xato yo'q). */
export function validateAddressForm({ label, address, apartment, coords }) {
  const errors = {};
  const l = String(label || '').trim();
  const a = String(address || '').trim();
  if (!l || l.length > ADDRESS_LIMITS.label) errors.label = 'addrLabelInvalid';
  if (a.length < ADDRESS_LIMITS.addressMin || a.length > ADDRESS_LIMITS.address) errors.address = 'addrTextInvalid';
  if (String(apartment || '').trim().length > ADDRESS_LIMITS.apartment) errors.apartment = 'addrApartmentInvalid';
  if (/[<>]/.test(l + a + (apartment || ''))) errors.address = 'invalidValue';
  if (coords && !isValidCoords(coords)) errors.coords = 'locationInvalid';
  return errors;
}

/**
 * POST/PATCH /addresses tanasi — faqat DTO maydonlari. Bo'sh `apartment`
 * yuborilmaydi (create) yoki bo'sh satr bilan tozalanadi (update).
 */
export function toAddressPayload({ label, address, apartment, coords, isDefault }, { isUpdate = false } = {}) {
  const body = {
    label: String(label).trim(),
    address: String(address).trim().replace(/\s+/g, ' '),
  };
  const apt = String(apartment || '').trim();
  if (apt) body.apartment = apt;
  else if (isUpdate) body.apartment = '';
  if (isValidCoords(coords)) {
    body.latitude = round6(coords.latitude);
    body.longitude = round6(coords.longitude);
  }
  if (typeof isDefault === 'boolean') body.isDefault = isDefault;
  return body;
}
