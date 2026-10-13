import { Transform } from 'class-transformer';

/**
 * "+998 90 123-45-67", "998901234567", "901234567" -> "+998901234567".
 * Noto'g'ri formatda bo'lsa o'zgarishsiz qaytaradi (keyin validator ushlaydi).
 */
export function normalizePhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return value.trim();
}

export const UZ_PHONE_REGEX = /^\+998\d{9}$/;
export const UZ_PHONE_MESSAGE = "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak";

export const NormalizePhone = () => Transform(({ value }) => normalizePhone(value));
