/**
 * HTTP qatlamining muhitga bog'liq sozlamalari (CORS originlari, reverse proxy).
 * setup-app.ts shu yerdan o'qiydi — alohida funksiyalar, shuning uchun unit test qilinadi.
 */

/** "https://a.uz/, http://b.uz" -> ["https://a.uz", "http://b.uz"] (brauzer Origin headerida oxirgi "/" bo'lmaydi) */
export function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Express "trust proxy" qiymati. Railway kabi reverse proxy ortida req.ip proxy manzili
 * bo'lib qoladi va rate-limit hamma foydalanuvchiga bitta bo'lib ishlaydi — shuning uchun
 * productionda standart holatda bitta proxy'ga ishoniladi (X-Forwarded-For dagi oxirgi manzil).
 * TRUST_PROXY: "false" | "true" | hop soni ("1", "2") | express formatidagi ro'yxat ("loopback, 10.0.0.0/8").
 */
export function parseTrustProxy(value: string | undefined, nodeEnv: string | undefined): boolean | number | string {
  const raw = value?.trim();
  if (!raw) return nodeEnv === 'production' ? 1 : false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}
