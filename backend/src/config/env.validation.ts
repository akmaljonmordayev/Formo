/**
 * Muhit o'zgaruvchilarini server ishga tushishidan oldin tekshiradi.
 * Productionda repoda ochiq yozilgan dev qiymatlari (admin123, dev JWT secret)
 * bilan ishga tushish taqiqlanadi — server xato bilan to'xtaydi.
 */

import { parseCorsOrigins } from './http.config';

// Repoda (docker-compose.yml, .env.example, testlar) ochiq turgan qiymatlar
const PUBLIC_JWT_SECRETS = new Set([
  'change-me-access-secret',
  'formo-dev-only-secret-change-in-production',
  'test-access-secret-0123456789abcdef',
]);
const PUBLIC_PASSWORDS = new Set(['admin123', 'operator123', 'tailor123', 'password', '12345678', '123456']);

const MIN_PROD_SECRET_LENGTH = 32;
const MIN_PROD_PASSWORD_LENGTH = 10;

export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];
  const str = (key: string) => (typeof config[key] === 'string' ? (config[key] as string) : '');

  const jwtSecret = str('JWT_ACCESS_SECRET');
  if (!jwtSecret) errors.push('JWT_ACCESS_SECRET berilmagan');

  if (str('NODE_ENV') === 'production') {
    if (!str('DATABASE_URL')) errors.push('DATABASE_URL berilmagan');

    // CORS: panel manzili bo'lmasa brauzer hamma so'rovni bloklaydi. Sxemasiz qiymat
    // (masalan Railway'ning RAILWAY_PUBLIC_DOMAIN o'zi) ham hech qachon mos kelmaydi.
    const origins = parseCorsOrigins(str('FRONTEND_URL') || '');
    if (!origins.length) {
      errors.push('FRONTEND_URL berilmagan (web panel manzili, masalan https://panel.formo.uz)');
    } else {
      const bad = origins.filter((o) => !/^https?:\/\/[^/\s]+$/.test(o));
      if (bad.length) errors.push(`FRONTEND_URL noto'g'ri: ${bad.join(', ')} — https://domen ko'rinishida bo'lishi kerak`);
    }

    // Productionda Swagger faqat parol bilan: API hujjati hammaga ochiq turmasin
    if (str('SWAGGER_ENABLED') === 'true') {
      const swaggerPassword = str('SWAGGER_PASSWORD');
      if (!swaggerPassword) {
        errors.push('SWAGGER_ENABLED=true uchun SWAGGER_PASSWORD berilishi shart');
      } else if (PUBLIC_PASSWORDS.has(swaggerPassword.toLowerCase()) || swaggerPassword.length < MIN_PROD_PASSWORD_LENGTH) {
        errors.push(`SWAGGER_PASSWORD kamida ${MIN_PROD_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak (dev parollar mumkin emas)`);
      }
    }

    if (jwtSecret && PUBLIC_JWT_SECRETS.has(jwtSecret)) {
      errors.push("JWT_ACCESS_SECRET repodagi dev qiymati — yangi tasodifiy qiymat qo'ying (openssl rand -hex 32)");
    } else if (jwtSecret && jwtSecret.length < MIN_PROD_SECRET_LENGTH) {
      errors.push(`JWT_ACCESS_SECRET kamida ${MIN_PROD_SECRET_LENGTH} belgidan iborat bo'lishi kerak`);
    }

    // Bot ↔ backend ichki tokeni: berilgan bo'lsa — uzun va tasodifiy bo'lishi shart
    const internalToken = str('TELEGRAM_INTERNAL_TOKEN');
    if (internalToken && internalToken.length < MIN_PROD_SECRET_LENGTH) {
      errors.push(`TELEGRAM_INTERNAL_TOKEN kamida ${MIN_PROD_SECRET_LENGTH} belgidan iborat bo'lishi kerak (openssl rand -hex 32)`);
    }

    // Fayl xotirasi (3D dizayn rasmlari): S3 berilgan bo'lsa — to'liq bo'lishi shart.
    // Berilmasa yuklash 503 qaytaradi (UPLOAD_DIR volume bo'lmasa Railway diski deploy'da tozalanadi).
    if (str('S3_BUCKET')) {
      if (!/^https:\/\/[^\s]+$/.test(str('S3_PUBLIC_URL'))) errors.push("S3_PUBLIC_URL berilmagan yoki https:// bilan boshlanmaydi (masalan https://cdn.formo.uz)");
      if (!str('S3_ACCESS_KEY_ID') || !str('S3_SECRET_ACCESS_KEY')) errors.push('S3_ACCESS_KEY_ID va S3_SECRET_ACCESS_KEY berilishi shart');
    }

    // Superadmin paroli faqat birinchi seed uchun kerak; berilgan bo'lsa — kuchli bo'lishi shart
    const password = str('SUPERADMIN_PASSWORD');
    if (password && PUBLIC_PASSWORDS.has(password.toLowerCase())) {
      errors.push("SUPERADMIN_PASSWORD repodagi dev paroli — productionda o'zgartiring");
    } else if (password && password.length < MIN_PROD_PASSWORD_LENGTH) {
      errors.push(`SUPERADMIN_PASSWORD kamida ${MIN_PROD_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak`);
    }
  }

  if (errors.length) {
    throw new Error(`Muhit sozlamalarida xato:\n  - ${errors.join('\n  - ')}`);
  }
  return config;
}
