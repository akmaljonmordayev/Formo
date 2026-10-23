import { ApiError } from '../services/api';

/**
 * Server OTP orqali yangi hisob ochganda `fullName`ga shu qiymatni yozadi
 * (backend/src/auth/auth.service.ts: otpLogin). Bu haqiqiy ism emas — UI'da
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

/** Lokal tekshiruv (backend UpdateProfileDto bilan bir xil): i18n kaliti yoki null. */
export function validateName(first, last) {
  const full = joinFullName(first, last);
  if (!String(first || '').trim()) return 'fullNameRequired';
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
