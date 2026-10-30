import { ApiError } from '../../services/api';

/**
 * Telegram bot orqali kirish — ekrandan mustaqil yordamchilar (testlanadi).
 * Backend shartnomasi: backend/src/telegram (start → deepLink, verify → sessiya).
 */

export const TELEGRAM_CODE_LENGTH = 5;

/** Yangi so'rov tugmasi shu vaqtdan keyin yoqiladi (server: raqamga soatiga 10 ta so'rov) */
export const NEW_REQUEST_COOLDOWN_SEC = 30;

/** expiresAt gacha qolgan butun soniyalar (0 dan kam emas) */
export function secondsUntil(expiresAt, now = Date.now()) {
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

/** 125 -> "2:05" */
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Faqat raqamlar, 5 tagacha (paste qilingan "Kod: 48213" ham ishlaydi) */
export function cleanCode(text) {
  return String(text || '').replace(/\D/g, '').slice(0, TELEGRAM_CODE_LENGTH);
}

/** Backend javobi kutilgan shaklda ekanini tekshiradi — aks holda Telegram ochilmaydi */
export function isValidChallenge(challenge) {
  return Boolean(
    challenge &&
      typeof challenge.challengeId === 'string' &&
      typeof challenge.deepLink === 'string' &&
      /^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}\?start=[A-Za-z0-9_-]{20,64}$/.test(challenge.deepLink),
  );
}

/**
 * Xatoni ekranda ko'rsatiladigan matnga aylantiradi.
 * 401: server "muddati o'tgan" va "noto'g'ri" ni ajratadi — lokalizatsiya uchun kalitga o'giramiz.
 * 400/403: serverning o'z sababi (bloklangan, xodim hisobi, validatsiya).
 */
export function telegramErrorText(err, t) {
  if (err instanceof ApiError) {
    if (err.status === 401) return /muddati/i.test(err.message || '') ? t('tgCodeExpired') : t('otpCodeWrong');
    if (err.status === 429) return t('tooManyAttempts');
    if (err.status === 503) return t('tgUnavailable');
    if (err.status === 0 || err.status >= 500) return t('networkError');
    return err.message || t('authError');
  }
  if (err instanceof TypeError) return t('networkError');
  return t('authError');
}
