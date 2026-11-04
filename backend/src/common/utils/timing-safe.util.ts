import { createHash, timingSafeEqual } from 'crypto';

/**
 * Doimiy vaqtli taqqoslash yordamchilari — avval payme/click/telegram-auth/auth servislarida
 * mustaqil qayta yozilgan edi (DRY). Ikki holat bor:
 *  - ixtiyoriy uzunlikdagi "xom" qiymatlarni solishtirish kerak (token, parol) → avval SHA-256
 *    bilan belgilangan uzunlikka keltiriladi, aks holda `timingSafeEqual` uzunlik farqida xato
 *    tashlaydi (va shu xato o'zi vaqt orqali ma'lumot oshkor qilardi);
 *  - ikki tomoni ham allaqachon bir xil formatdagi xesh/imzo (masalan ikkita sha256 hex) —
 *    qo'shimcha xeshlashsiz, faqat uzunlik tekshiruvi + doimiy vaqtli solishtirish.
 */

/** SHA-256 xesh, xom bayt ko'rinishida (uzunligi doim 32 bayt). */
export function sha256Buffer(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** SHA-256 xesh, hex satr ko'rinishida (uzunligi doim 64 belgi). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Ixtiyoriy uzunlikdagi ikki qiymatni doimiy vaqtda solishtiradi (avval SHA-256 bilan
 * normallashtirilgan holda) — token/parol/imzo kabi uzunligi oldindan bir xil bo'lmasligi
 * mumkin bo'lgan qiymatlar uchun.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  return timingSafeEqual(sha256Buffer(a), sha256Buffer(b));
}

/**
 * Ikki tomoni ham allaqachon bir xil formatdagi xesh/imzo (hex va sh.k.) bo'lganda — qo'shimcha
 * xeshlashsiz, faqat uzunlik tekshiruvi (farqli uzunlikda `timingSafeEqual` xato tashlamasin) va
 * doimiy vaqtli solishtirish.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
