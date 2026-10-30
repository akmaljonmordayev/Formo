import { randomBytes } from 'crypto';
import { validateEnv } from './env.validation';

// Test qiymatlari har safar generatsiya qilinadi (repoda parolga o'xshash literal bo'lmasin)
const STRONG_SECRET = randomBytes(32).toString('hex');
const STRONG_PASSWORD = randomBytes(12).toString('hex');
const prod = (extra: Record<string, string> = {}) => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db:5432/formo',
  FRONTEND_URL: 'https://panel.example.com',
  JWT_ACCESS_SECRET: STRONG_SECRET,
  SUPERADMIN_PASSWORD: STRONG_PASSWORD,
  ...extra,
});

describe('validateEnv', () => {
  describe('development', () => {
    it("dev standart qiymatlari bilan ishlaydi", () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'development',
          JWT_ACCESS_SECRET: 'formo-dev-only-secret-change-in-production',
          SUPERADMIN_PASSWORD: 'admin123',
        }),
      ).not.toThrow();
    });

    it('JWT_ACCESS_SECRET umuman bo‘lmasa — xato', () => {
      expect(() => validateEnv({ NODE_ENV: 'development' })).toThrow(/JWT_ACCESS_SECRET berilmagan/);
    });
  });

  describe('production', () => {
    it('kuchli qiymatlar bilan ishlaydi', () => {
      expect(() => validateEnv(prod())).not.toThrow();
    });

    it.each(['change-me-access-secret', 'formo-dev-only-secret-change-in-production', 'test-access-secret-0123456789abcdef'])(
      'repodagi JWT secret rad etiladi: %s',
      (secret) => {
        expect(() => validateEnv(prod({ JWT_ACCESS_SECRET: secret }))).toThrow(/repodagi dev qiymati/);
      },
    );

    it('qisqa JWT secret rad etiladi', () => {
      expect(() => validateEnv(prod({ JWT_ACCESS_SECRET: STRONG_SECRET.slice(0, 12) }))).toThrow(/kamida 32/);
    });

    it.each(['admin123', 'ADMIN123', 'operator123', 'tailor123'])('repodagi superadmin paroli rad etiladi: %s', (pw) => {
      expect(() => validateEnv(prod({ SUPERADMIN_PASSWORD: pw }))).toThrow(/dev paroli/);
    });

    it('qisqa superadmin paroli rad etiladi', () => {
      expect(() => validateEnv(prod({ SUPERADMIN_PASSWORD: STRONG_PASSWORD.slice(0, 7) }))).toThrow(/kamida 10/);
    });

    it('superadmin allaqachon yaratilgan bo‘lsa, SUPERADMIN_PASSWORD bermaslik mumkin', () => {
      const { SUPERADMIN_PASSWORD: _, ...rest } = prod();
      expect(() => validateEnv(rest)).not.toThrow();
    });

    it('TELEGRAM_INTERNAL_TOKEN: ixtiyoriy, lekin berilsa qisqa bo‘lmasin', () => {
      expect(() => validateEnv(prod())).not.toThrow();
      expect(() => validateEnv(prod({ TELEGRAM_INTERNAL_TOKEN: STRONG_SECRET }))).not.toThrow();
      expect(() => validateEnv(prod({ TELEGRAM_INTERNAL_TOKEN: 'short-token' }))).toThrow(/TELEGRAM_INTERNAL_TOKEN/);
    });

    it('DATABASE_URL bo‘lmasa — xato', () => {
      expect(() => validateEnv(prod({ DATABASE_URL: '' }))).toThrow(/DATABASE_URL berilmagan/);
    });

    it('FRONTEND_URL bo‘lmasa — xato', () => {
      expect(() => validateEnv(prod({ FRONTEND_URL: '' }))).toThrow(/FRONTEND_URL berilmagan/);
    });

    it.each(['panel.example.com', 'https://panel.example.com/login', 'https://ok.example.com,ftp://x'])(
      'FRONTEND_URL origin ko‘rinishida bo‘lmasa — xato: %s',
      (url) => {
        expect(() => validateEnv(prod({ FRONTEND_URL: url }))).toThrow(/FRONTEND_URL noto'g'ri/);
      },
    );

    it('FRONTEND_URL: bir nechta origin va oxirgi "/" qabul qilinadi', () => {
      expect(() => validateEnv(prod({ FRONTEND_URL: 'https://a.example.com/, http://b.example.com:8080' }))).not.toThrow();
    });

    it('Swagger yoqilsa parol majburiy', () => {
      expect(() => validateEnv(prod({ SWAGGER_ENABLED: 'true' }))).toThrow(/SWAGGER_PASSWORD berilishi shart/);
      expect(() => validateEnv(prod({ SWAGGER_ENABLED: 'true', SWAGGER_PASSWORD: 'admin123' }))).toThrow(/SWAGGER_PASSWORD kamida 10/);
      expect(() => validateEnv(prod({ SWAGGER_ENABLED: 'true', SWAGGER_PASSWORD: 'short' }))).toThrow(/SWAGGER_PASSWORD kamida 10/);
      expect(() => validateEnv(prod({ SWAGGER_ENABLED: 'true', SWAGGER_PASSWORD: STRONG_PASSWORD }))).not.toThrow();
    });

    it('Swagger o‘chiq bo‘lsa SWAGGER_PASSWORD talab qilinmaydi', () => {
      expect(() => validateEnv(prod({ SWAGGER_ENABLED: 'false' }))).not.toThrow();
    });

    it('bir nechta xato birga ko‘rsatiladi', () => {
      expect(() =>
        validateEnv(prod({ JWT_ACCESS_SECRET: 'change-me-access-secret', SUPERADMIN_PASSWORD: 'admin123' })),
      ).toThrow(/JWT_ACCESS_SECRET[\s\S]*SUPERADMIN_PASSWORD/);
    });
  });
});
