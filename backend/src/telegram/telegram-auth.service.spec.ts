import { ForbiddenException, HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, TelegramAuthChallenge } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  MAX_CHALLENGES_PER_PHONE_HOUR,
  MAX_CODE_ATTEMPTS,
  MAX_CODE_SENDS,
  RESEND_COOLDOWN_MS,
  TelegramAuthService,
  maskPhone,
} from './telegram-auth.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const PHONE = '+998901234567';
const TG = '555000111';
const CHAT = '555000111';
const ID = '11111111-1111-4111-8111-111111111111';
const ENV: Record<string, string> = {
  TELEGRAM_BOT_USERNAME: '@formo_test_bot',
  TELEGRAM_INTERNAL_TOKEN: 'x'.repeat(40),
  JWT_ACCESS_SECRET: 'unit-test-secret',
};

describe('TelegramAuthService', () => {
  const tx = {
    telegramAuthChallenge: { updateMany: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
    telegramAccount: { deleteMany: jest.fn(), upsert: jest.fn() },
  };
  const prisma = {
    telegramAuthChallenge: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    telegramAccount: { updateMany: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const auth = { issueTokens: jest.fn() };
  const config = { get: jest.fn((k: string) => ENV[k]), getOrThrow: jest.fn((k: string) => ENV[k]) };
  const service = new TelegramAuthService(
    prisma as unknown as PrismaService,
    auth as unknown as AuthService,
    config as unknown as ConfigService,
  );

  const challenge = (over: Partial<TelegramAuthChallenge> = {}): TelegramAuthChallenge => ({
    id: ID,
    phone: PHONE,
    startTokenHash: 'h',
    telegramUserId: TG,
    chatId: CHAT,
    claimedAt: new Date(),
    phoneVerifiedAt: null,
    codeHash: null,
    codeExpiresAt: null,
    codeSentAt: null,
    codeSends: 0,
    attempts: 0,
    consumedAt: null,
    failedAt: null,
    ip: null,
    expiresAt: new Date(Date.now() + 600_000),
    createdAt: new Date(),
    ...over,
  });

  /** Haqiqiy kodni olish: contact() → CODE, xesh esa updateMany data'sidan saqlanadi */
  async function issue(over: Partial<TelegramAuthChallenge> = {}) {
    prisma.telegramAuthChallenge.findFirst.mockResolvedValue(challenge(over));
    prisma.telegramAuthChallenge.updateMany.mockResolvedValue({ count: 1 });
    const res = await service.contact(TG, '998 90 123 45 67');
    if (res.result !== 'CODE') throw new Error(`kutilgan CODE, keldi ${res.result}`);
    const data = prisma.telegramAuthChallenge.updateMany.mock.calls.at(-1)![0].data;
    return { code: res.code, codeHash: data.codeHash as string, codeExpiresAt: data.codeExpiresAt as Date };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
    config.get.mockImplementation((k: string) => ENV[k]);
    auth.issueTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: {} });
  });

  it('maskPhone faqat boshi va oxirini ko‘rsatadi', () => {
    expect(maskPhone(PHONE)).toBe('+998 90 *** ** 67');
  });

  describe('start', () => {
    it('bot sozlanmagan bo‘lsa — 503', async () => {
      config.get.mockImplementation((k: string) => (k === 'TELEGRAM_BOT_USERNAME' ? '' : ENV[k]));
      await expect(service.start(PHONE, {})).rejects.toThrow(ServiceUnavailableException);
    });

    it('deep-link token faqat xesh holida saqlanadi, javob raqam borligini oshkor qilmaydi', async () => {
      prisma.telegramAuthChallenge.count.mockResolvedValue(0);
      prisma.telegramAuthChallenge.create.mockImplementation(async ({ data }) => ({ id: ID, ...data }));

      const res = await service.start(PHONE, { ip: '1.2.3.4' });

      const token = res.deepLink.split('?start=')[1];
      expect(res.deepLink.startsWith('https://t.me/formo_test_bot?start=')).toBe(true);
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const { data } = prisma.telegramAuthChallenge.create.mock.calls[0][0];
      expect(data.startTokenHash).toBe(sha256(token));
      expect(JSON.stringify(data)).not.toContain(token);
      expect(Object.keys(res).sort()).toEqual(['botUsername', 'challengeId', 'deepLink', 'expiresAt']);
    });

    it('bir raqamga soatiga limitdan ko‘p so‘rov — 429', async () => {
      prisma.telegramAuthChallenge.count.mockResolvedValue(MAX_CHALLENGES_PER_PHONE_HOUR);
      await expect(service.start(PHONE, {})).rejects.toThrow(HttpException);
      expect(prisma.telegramAuthChallenge.create).not.toHaveBeenCalled();
    });
  });

  describe('claim', () => {
    it('noma’lum yoki muddati o‘tgan token — INVALID', async () => {
      prisma.telegramAuthChallenge.findUnique.mockResolvedValue(null);
      expect(await service.claim('a'.repeat(43), TG, CHAT)).toEqual({ result: 'INVALID' });

      prisma.telegramAuthChallenge.findUnique.mockResolvedValue(challenge({ expiresAt: new Date(Date.now() - 1) }));
      expect(await service.claim('a'.repeat(43), TG, CHAT)).toEqual({ result: 'INVALID' });
    });

    it('boshqa Telegram foydalanuvchisi egallagan so‘rov — INVALID', async () => {
      prisma.telegramAuthChallenge.findUnique.mockResolvedValue(challenge({ telegramUserId: '999' }));
      expect(await service.claim('a'.repeat(43), TG, CHAT)).toEqual({ result: 'INVALID' });
      expect(prisma.telegramAuthChallenge.updateMany).not.toHaveBeenCalled();
    });

    it('bo‘sh so‘rovni egallaydi va kontakt so‘raydi', async () => {
      prisma.telegramAuthChallenge.findUnique
        .mockResolvedValueOnce(challenge({ telegramUserId: null, chatId: null, claimedAt: null }))
        .mockResolvedValueOnce(challenge());
      prisma.telegramAuthChallenge.updateMany.mockResolvedValue({ count: 1 });

      expect(await service.claim('a'.repeat(43), TG, CHAT)).toEqual({ result: 'CONTACT_REQUIRED', maskedPhone: '+998 90 *** ** 67' });
      expect(prisma.telegramAuthChallenge.updateMany.mock.calls[0][0].where).toEqual({ id: ID, telegramUserId: null });
    });

    it('poygada boshqasi oldinroq egallasa — INVALID', async () => {
      prisma.telegramAuthChallenge.findUnique
        .mockResolvedValueOnce(challenge({ telegramUserId: null }))
        .mockResolvedValueOnce(challenge({ telegramUserId: '999' }));
      prisma.telegramAuthChallenge.updateMany.mockResolvedValue({ count: 0 });
      expect(await service.claim('a'.repeat(43), TG, CHAT)).toEqual({ result: 'INVALID' });
    });
  });

  describe('contact', () => {
    it('faol so‘rov bo‘lmasa — NO_CHALLENGE', async () => {
      prisma.telegramAuthChallenge.findFirst.mockResolvedValue(null);
      expect(await service.contact(TG, PHONE)).toEqual({ result: 'NO_CHALLENGE' });
    });

    it('boshqa raqam — PHONE_MISMATCH va so‘rov yopiladi', async () => {
      prisma.telegramAuthChallenge.findFirst.mockResolvedValue(challenge());
      prisma.telegramAuthChallenge.updateMany.mockResolvedValue({ count: 1 });

      expect(await service.contact(TG, '+998907777777')).toEqual({ result: 'PHONE_MISMATCH' });
      expect(prisma.telegramAuthChallenge.updateMany.mock.calls[0][0].data).toHaveProperty('failedAt');
    });

    it('mos raqam — 5 xonali kod, bazada faqat HMAC xeshi', async () => {
      const { code, codeHash } = await issue();
      expect(code).toMatch(/^\d{5}$/);
      expect(codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(codeHash).not.toBe(sha256(code));
      expect(codeHash).not.toContain(code);
    });

    it('qayta yuborish: cooldown va umumiy limit', async () => {
      prisma.telegramAuthChallenge.findFirst.mockResolvedValue(
        challenge({ phoneVerifiedAt: new Date(), codeSends: 1, codeSentAt: new Date() }),
      );
      const cooldown = await service.resend(TG);
      expect(cooldown.result).toBe('COOLDOWN');

      prisma.telegramAuthChallenge.findFirst.mockResolvedValue(
        challenge({ phoneVerifiedAt: new Date(), codeSends: MAX_CODE_SENDS, codeSentAt: new Date(Date.now() - RESEND_COOLDOWN_MS * 2) }),
      );
      expect(await service.resend(TG)).toEqual({ result: 'LIMIT' });
    });

    it('raqam tasdiqlanmagan bo‘lsa resend kontakt so‘raydi', async () => {
      prisma.telegramAuthChallenge.findFirst.mockResolvedValue(challenge());
      expect(await service.resend(TG)).toEqual({ result: 'CONTACT_REQUIRED' });
    });
  });

  describe('verify', () => {
    async function ready(over: Partial<TelegramAuthChallenge> = {}) {
      const issued = await issue();
      jest.clearAllMocks();
      prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
      auth.issueTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: {} });
      prisma.telegramAuthChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.telegramAuthChallenge.findUnique.mockResolvedValue(
        challenge({ codeHash: issued.codeHash, codeExpiresAt: issued.codeExpiresAt, phoneVerifiedAt: new Date(), attempts: 1, ...over }),
      );
      tx.telegramAuthChallenge.updateMany.mockResolvedValue({ count: 1 });
      return issued.code;
    }

    it('muddati o‘tgan / ishlatilgan / urinishlari tugagan — 401, kod solishtirilmaydi', async () => {
      prisma.telegramAuthChallenge.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.verify(ID, '12345', {})).rejects.toThrow(UnauthorizedException);
      expect(prisma.telegramAuthChallenge.findUnique).not.toHaveBeenCalled();
      const { where } = prisma.telegramAuthChallenge.updateMany.mock.calls[0][0];
      expect(where).toMatchObject({ consumedAt: null, failedAt: null, attempts: { lt: MAX_CODE_ATTEMPTS } });
    });

    it('noto‘g‘ri kod — 401; oxirgi urinishda so‘rov yopiladi', async () => {
      const code = await ready({ attempts: MAX_CODE_ATTEMPTS });
      const wrong = code === '00000' ? '11111' : '00000';
      await expect(service.verify(ID, wrong, {})).rejects.toThrow(UnauthorizedException);
      expect(prisma.telegramAuthChallenge.updateMany.mock.calls.at(-1)![0].data).toHaveProperty('failedAt');
      expect(auth.issueTokens).not.toHaveBeenCalled();
    });

    it('mavjud mijoz: kiradi, qayta ro‘yxatdan o‘tmaydi, Telegram ulanadi', async () => {
      const code = await ready();
      const user = { id: 7, phone: PHONE, role: Role.USER, isActive: true, fullName: 'Aziz', gender: 'MALE', age: 20 };
      tx.user.findUnique.mockResolvedValue(user);

      const res = await service.verify(ID, code, {});

      expect(tx.user.create).not.toHaveBeenCalled();
      expect(res).toMatchObject({ accessToken: 'a', isNewUser: false, profileComplete: true });
      expect(tx.telegramAccount.deleteMany).toHaveBeenCalledWith({ where: { telegramUserId: TG, userId: { not: 7 } } });
      expect(tx.telegramAccount.upsert.mock.calls[0][0].create).toEqual({ userId: 7, telegramUserId: TG, chatId: CHAT });
    });

    it('yangi raqam: USER hisobi ochiladi, parol bilan kirib bo‘lmaydi', async () => {
      const code = await ready();
      tx.user.findUnique.mockResolvedValue(null);
      tx.user.create.mockImplementation(async ({ data }) => ({ id: 9, isActive: true, gender: null, age: null, ...data }));

      const res = await service.verify(ID, code, {});

      const { data } = tx.user.create.mock.calls[0][0];
      expect(data.role).toBe(Role.USER);
      expect(await bcrypt.compare('formo-dummy-password', data.passwordHash)).toBe(false);
      expect(res).toMatchObject({ isNewUser: true, profileComplete: false });
    });

    it('kod ikkinchi marta ishlatilmaydi (replay)', async () => {
      const code = await ready();
      tx.telegramAuthChallenge.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.verify(ID, code, {})).rejects.toThrow(UnauthorizedException);
      expect(tx.user.findUnique).not.toHaveBeenCalled();
      expect(auth.issueTokens).not.toHaveBeenCalled();
    });

    it('xodim hisobi va bloklangan hisob — 403, ulanmaydi', async () => {
      let code = await ready();
      tx.user.findUnique.mockResolvedValue({ id: 1, role: Role.SUPERADMIN, isActive: true });
      await expect(service.verify(ID, code, {})).rejects.toThrow(ForbiddenException);
      expect(tx.telegramAccount.upsert).not.toHaveBeenCalled();

      code = await ready();
      tx.user.findUnique.mockResolvedValue({ id: 2, role: Role.USER, isActive: false });
      await expect(service.verify(ID, code, {})).rejects.toThrow(ForbiddenException);
      expect(tx.telegramAccount.upsert).not.toHaveBeenCalled();
    });

    it('boshqa so‘rov uchun chiqqan kod ishlamaydi (xesh challengeId ga bog‘langan)', async () => {
      const code = await ready({ id: '22222222-2222-4222-8222-222222222222' });
      await expect(service.verify('22222222-2222-4222-8222-222222222222', code, {})).rejects.toThrow(UnauthorizedException);
    });
  });

  it('stop/hello faqat chatId ni o‘zgartiradi', async () => {
    prisma.telegramAccount.updateMany.mockResolvedValue({ count: 1 });
    expect(await service.stop(TG)).toEqual({ linked: true });
    expect(prisma.telegramAccount.updateMany).toHaveBeenLastCalledWith({ where: { telegramUserId: TG }, data: { chatId: null } });
    prisma.telegramAccount.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.hello(TG, CHAT)).toEqual({ linked: false });
  });
});
