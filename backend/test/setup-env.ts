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
