import { API_BASE_URL, ApiError } from '../../services/api';

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
  // Server javob bermadi (tarmoq): RN eski versiyalarida TypeError, yangilarida oddiy Error ("fetch failed")
  const network = err instanceof TypeError || /fetch|network|timed out|abort|cancel/i.test(err?.message || '');
  // Dev buildda asl sabab va ulanayotgan server manzili — telefon serverga yetmayotgani darhol ko'rinadi
  if (typeof __DEV__ !== 'undefined' && __DEV__ && err?.message) {
    return `${t(network ? 'networkError' : 'authError')}: ${err.message}\n${API_BASE_URL}`;
  }
  return t(network ? 'networkError' : 'authError');
}

/**
 * https://t.me/<bot>?start=<token> → tg://resolve?domain=<bot>&start=<token>.
 * tg:// Telegram ilovasini to'g'ridan-to'g'ri ochadi (brauzer oraliq sahifasisiz, /start tokeni yo'qolmaydi).
 */
export function telegramAppLink(deepLink) {
  const m = /^https:\/\/t\.me\/([A-Za-z0-9_]{5,32})\?start=([A-Za-z0-9_-]{1,64})$/.exec(String(deepLink || ''));
  return m ? `tg://resolve?domain=${m[1]}&start=${m[2]}` : null;
}
