/**
 * ─── DEV-ONLY: demo telefon tasdiqlash ────────────────────────────────────────
 *
 * Backendda SMS/OTP endpointi YO'Q: `POST /auth/register` telefonni darhol
 * ro'yxatdan o'tkazadi. Shuning uchun bu qadam faqat ishlab chiqishda (__DEV__)
 * ishlaydigan mahalliy "gate": SMS yuborilmaydi va serverga kod so'rovi
 * ketmaydi. Kod to'g'ri bo'lsagina haqiqiy `auth.register` chaqiriladi.
 *
 * Production bundleida `__DEV__ === false`, shuning uchun qadam butunlay
 * o'tkazib yuboriladi va hech qanday soxta tasdiqlash ko'rsatilmaydi.
 * Ishlab chiqishda ham o'chirish: EXPO_PUBLIC_DEMO_OTP=false.
 */

const DEMO_OTP_CODE = '123456';

/** Demo qadam faqat dev buildda va aniq o'chirilmagan bo'lsa yoqiladi. */
export function isDemoOtpEnabled() {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && process.env.EXPO_PUBLIC_DEMO_OTP !== 'false';
}

/** Faqat raqamlar; 6 xonali demo kod bilan solishtiradi. */
export function isDemoOtpCode(value) {
  return String(value || '').replace(/\D/g, '') === DEMO_OTP_CODE;
}

/** UI uchun maslahat matni (kod faqat devda ko'rsatiladi). */
export const demoOtpHintCode = DEMO_OTP_CODE;
