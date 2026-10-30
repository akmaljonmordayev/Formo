import { ApiError } from '../services/api';

/**
 * Server parolsiz (Telegram) yangi hisob ochganda `fullName`ga shu qiymatni yozadi
 * (backend/src/auth/auth.service.ts: NEW_CUSTOMER_NAME). Bu haqiqiy ism emas — UI'da
 * "ism hali kiritilmagan" deb hisoblanadi.
 */
export const SERVER_PLACEHOLDER_NAME = 'Yangi mijoz';

export const NAME_LIMITS = { min: 2, max: 100 };

/** Haqiqiy (foydalanuvchi kiritgan) ism yoki null. */
export function realFullName(user) {
  const name = String(user?.fullName || '').trim();
  return name && name !== SERVER_PLACEHOLDER_NAME ? name : null;
}

/** Ko'rsatish uchun: haqiqiy ism, bo'lmasa `fallback`. */
export function displayName(user, fallback) {
  return realFullName(user) || fallback;
}

/** Avatar harfi: ismning birinchi harfi, bo'lmasa "F" (Formo). */
export function nameInitial(user) {
  return (realFullName(user) || 'F').charAt(0).toUpperCase();
}

/** "Aziz Rahimov" -> { first: 'Aziz', last: 'Rahimov' }; ko'p so'zli familiya saqlanadi. */
export function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

/** Ism + familiya -> server `fullName` (bo'shliqlar tozalanadi). */
export function joinFullName(first, last) {
  return [first, last].map((part) => String(part || '').trim().replace(/\s+/g, ' ')).filter(Boolean).join(' ');
}

/** Lokal tekshiruv (backend UpdateProfileDto bilan bir xil): i18n kaliti yoki null. Ro'yxatdan o'tishda familiya ham majburiy. */
export function validateName(first, last, { requireLast = false } = {}) {
  const full = joinFullName(first, last);
  if (!String(first || '').trim()) return 'fullNameRequired';
  if (requireLast && !String(last || '').trim()) return 'lastNameRequired';
  if (full.length < NAME_LIMITS.min) return 'fullNameShort';
  if (full.length > NAME_LIMITS.max) return 'fullNameTooLong';
  if (/[<>]/.test(full)) return 'invalidValue';
  return null;
}

/**
 * Eski (hali yangilanmagan) backend `fullName`ni rad etadi:
 * 400 "property fullName should not exist" (forbidNonWhitelisted).
 */
export function isNameUnsupportedError(err) {
  return err instanceof ApiError && err.status === 400 && /fullName should not exist/i.test(err.message || '');
}

/**
 * Ro'yxatdan o'tish qadamlari kerakmi: ism, jins va yosh majburiy (o'tkazib bo'lmaydi);
 * bo'y/vazn ixtiyoriy — bir marta so'raladi.
 */
export function profileGaps(user) {
  if (!user) return { required: false, optional: false };
  return {
    required: !realFullName(user) || user.gender == null || user.age == null,
    optional: user.height == null || user.weight == null,
  };
}
