/**
 * ─── DEV-ONLY: demo telefon tasdiqlash ────────────────────────────────────────
 *
 * Haqiqiy SMS integratsiyasi yo'q: hech qachon SMS yuborilmaydi, faqat kod
 * 12345 ekanligi tekshiriladi. `POST /auth/otp-login` ham xuddi shu kodni
 * kutadi (backend/src/auth/auth.service.ts: otpLoginEnabled/DEMO_OTP_CODE).
 * Bu yerdagi `isDemoOtpEnabled()` faqat UI'da OTP qadamini ko'rsatish/
 * yashirish uchun — haqiqiy tekshiruv serverda.
 *
 * Production bundleida `__DEV__ === false`, shuning uchun qadam butunlay
 * o'tkazib yuboriladi va hech qanday soxta tasdiqlash ko'rsatilmaydi.
 * Ishlab chiqishda ham o'chirish: EXPO_PUBLIC_DEMO_OTP=false.
 */

export const OTP_LENGTH = 5;
const DEMO_OTP_CODE = '12345';

/** Demo qadam faqat dev buildda va aniq o'chirilmagan bo'lsa yoqiladi. */
export function isDemoOtpEnabled() {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && process.env.EXPO_PUBLIC_DEMO_OTP !== 'false';
}

/** Faqat raqamlar; demo kod bilan solishtiradi. */
export function isDemoOtpCode(value) {
  return String(value || '').replace(/\D/g, '') === DEMO_OTP_CODE;
}

/** UI uchun maslahat matni (kod faqat devda ko'rsatiladi). */
export const demoOtpHintCode = DEMO_OTP_CODE;

/** UI uchun maslahat matni (faqat devda ko'rsatiladi). */
export const demoOtpHintText = `Demo rejim — kod: ${DEMO_OTP_CODE}`;
