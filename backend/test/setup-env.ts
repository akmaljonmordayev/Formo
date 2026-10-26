// Har bir test fayli uchun muhit: alohida test bazasi, yuqori rate-limit
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://formo:formo@localhost:5435/formo_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_TTL_DAYS = '30';
process.env.SUPERADMIN_PHONE = '+998901111111';
process.env.SUPERADMIN_PASSWORD = 'admin123';
process.env.SUPERADMIN_NAME = 'Super Admin';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.THROTTLE_AUTH_LIMIT ??= '10000';
process.env.THROTTLE_LIMIT ??= '10000';

// Prisma Client import paytida backend/.env ni process.env ga yuklaydi (mavjud qiymatlarni bosmaydi).
// Dasturchining haqiqiy bot tokeni / to'lov kalitlari testlarga sizmasligi uchun hammasi shu yerda
// test qiymatlariga qotiriladi. Bular soxta — hech qanday real tizimga ulanmaydi.
process.env.TELEGRAM_BOT_TOKEN = '';
process.env.TELEGRAM_BOT_USERNAME = 'formo_e2e_bot';
process.env.TELEGRAM_INTERNAL_TOKEN = 'e2e-internal-token-0123456789abcdef0123';
process.env.CLICK_SERVICE_ID = '12345';
process.env.CLICK_MERCHANT_ID = '678';
process.env.CLICK_SECRET_KEY = 'click-test-secret';
process.env.PAYME_MERCHANT_ID = 'payme-test-merchant';
process.env.PAYME_KEY = 'payme-test-key';
process.env.PAYME_TEST = 'true';
process.env.PAYMENT_RETURN_URL = '';
