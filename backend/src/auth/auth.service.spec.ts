import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const DAY = 24 * 60 * 60 * 1000;
const PASSWORD = 'secret123';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

describe('AuthService', () => {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    session: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const jwt = new JwtService({ secret: 'unit-test-secret', signOptions: { expiresIn: '15m' } });
  const config = { get: jest.fn() };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt,
    config as unknown as ConfigService,
  );

  let user: User;

  beforeAll(async () => {
    user = {
      id: 7,
      phone: '+998901234567',
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role: Role.USER,
      fullName: 'Aziz Rahimov',
      isActive: true,
    } as User;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockReturnValue(undefined);
    prisma.session.create.mockImplementation(async ({ data }) => ({ id: SESSION_ID, ...data }));
    prisma.session.findUnique.mockReturnValue(Promise.resolve(null));
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('register', () => {
    const dto = { phone: '+998901234567', password: PASSWORD, fullName: 'Aziz Rahimov' };

    it('telefon band bo‘lsa — 409, akkaunt yaratilmaydi', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.register(dto, {})).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('har doim USER roli bilan yaratadi va parolni xeshlab saqlaydi', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }) => ({ id: 8, isActive: true, ...data }));

      const result = await service.register(dto, { ip: '1.2.3.4' });

      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.role).toBe(Role.USER);
      expect(data).not.toHaveProperty('password');
      expect(data.passwordHash).not.toBe(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, data.passwordHash)).toBe(true);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toEqual(expect.any(String));
    });
  });

  describe('login', () => {
    it('to‘g‘ri parol: sessiya ochiladi, tokenlar qaytadi', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.login({ phone: user.phone, password: PASSWORD }, { userAgent: 'jest', ip: '1.2.3.4' });

      expect(jwt.verify(result.accessToken)).toMatchObject({ sub: 7, role: Role.USER, sid: SESSION_ID });
      const [sessionId, secret] = result.refreshToken.split('.');
      expect(sessionId).toBe(SESSION_ID);
      // Bazada refresh tokenning o'zi emas, faqat xeshi saqlanadi
      const { data } = prisma.session.create.mock.calls[0][0];
      expect(data.refreshTokenHash).toBe(sha256(secret));
      expect(data.refreshTokenHash).not.toContain(secret);
      expect(data).toMatchObject({ userId: 7, userAgent: 'jest', ip: '1.2.3.4' });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('sessiya muddati REFRESH_TOKEN_TTL_DAYS dan olinadi (standart 30 kun)', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await service.login({ phone: user.phone, password: PASSWORD }, {});
      const defaultExpiry = prisma.session.create.mock.calls[0][0].data.expiresAt.getTime();
      expect(Math.round((defaultExpiry - Date.now()) / DAY)).toBe(30);

      config.get.mockReturnValue('7');
      await service.login({ phone: user.phone, password: PASSWORD }, {});
      const customExpiry = prisma.session.create.mock.calls[1][0].data.expiresAt.getTime();
      expect(Math.round((customExpiry - Date.now()) / DAY)).toBe(7);
    });

    it('juda uzun User-Agent 255 belgigacha qirqiladi', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      await service.login({ phone: user.phone, password: PASSWORD }, { userAgent: 'x'.repeat(1000) });
      expect(prisma.session.create.mock.calls[0][0].data.userAgent).toHaveLength(255);
    });

    it('noto‘g‘ri parol va mavjud bo‘lmagan raqam — bir xil 401 (raqam borligi oshkor bo‘lmaydi)', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      const wrongPassword = await service.login({ phone: user.phone, password: 'wrong' }, {}).catch((e) => e);
      prisma.user.findUnique.mockResolvedValue(null);
      const unknownPhone = await service.login({ phone: '+998900000000', password: PASSWORD }, {}).catch((e) => e);

      expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
      expect(unknownPhone).toBeInstanceOf(UnauthorizedException);
      expect(unknownPhone.message).toBe(wrongPassword.message);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('bloklangan akkaunt — 403', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });
      await expect(service.login({ phone: user.phone, password: PASSWORD }, {})).rejects.toThrow(ForbiddenException);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('bloklangan akkauntga noto‘g‘ri parol — 401 (blok holati oshkor bo‘lmaydi)', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });
      await expect(service.login({ phone: user.phone, password: 'wrong' }, {})).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const SECRET = 'a'.repeat(64);
    const session = (extra = {}) => ({
      id: SESSION_ID,
      userId: 7,
      refreshTokenHash: sha256(SECRET),
      revokedAt: null,
      expiresAt: new Date(Date.now() + DAY),
      user,
      ...extra,
    });

    it.each(['', 'no-dot', '.secret', `${SESSION_ID}.`])('formati buzuq token — 401: "%s"', async (token) => {
      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
      expect(prisma.session.findUnique).not.toHaveBeenCalled();
    });

    it('sessiya topilmasa — 401', async () => {
      await expect(service.refresh(`${SESSION_ID}.${SECRET}`)).rejects.toThrow(UnauthorizedException);
    });

    it('baza xatosi (uuid emas) — 401, 500 emas', async () => {
      prisma.session.findUnique.mockReturnValue(Promise.reject(new Error('invalid uuid')));
      await expect(service.refresh(`not-a-uuid.${SECRET}`)).rejects.toThrow(UnauthorizedException);
    });

    it('bekor qilingan yoki muddati o‘tgan sessiya — 401', async () => {
      prisma.session.findUnique.mockReturnValue(Promise.resolve(session({ revokedAt: new Date() })));
      await expect(service.refresh(`${SESSION_ID}.${SECRET}`)).rejects.toThrow(UnauthorizedException);

      prisma.session.findUnique.mockReturnValue(Promise.resolve(session({ expiresAt: new Date(Date.now() - 1000) })));
      await expect(service.refresh(`${SESSION_ID}.${SECRET}`)).rejects.toThrow(UnauthorizedException);
      expect(prisma.session.update).not.toHaveBeenCalled();
    });

    it('eski (almashtirilgan) token qayta ishlatilsa — sessiya bekor qilinadi', async () => {
      prisma.session.findUnique.mockReturnValue(Promise.resolve(session()));

      await expect(service.refresh(`${SESSION_ID}.${'b'.repeat(64)}`)).rejects.toThrow(UnauthorizedException);

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: SESSION_ID, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.session.update).not.toHaveBeenCalled();
    });

    it('bloklangan foydalanuvchi — 403 va sessiya bekor qilinadi', async () => {
      prisma.session.findUnique.mockReturnValue(Promise.resolve(session({ user: { ...user, isActive: false } })));
      await expect(service.refresh(`${SESSION_ID}.${SECRET}`)).rejects.toThrow(ForbiddenException);
      expect(prisma.session.updateMany).toHaveBeenCalled();
    });

    it('to‘g‘ri token: rotatsiya — yangi secret, eski xesh almashtiriladi', async () => {
      prisma.session.findUnique.mockReturnValue(Promise.resolve(session()));

      const result = await service.refresh(`${SESSION_ID}.${SECRET}`);

      const [sessionId, newSecret] = result.refreshToken.split('.');
      expect(sessionId).toBe(SESSION_ID);
      expect(newSecret).not.toBe(SECRET);
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        data: { refreshTokenHash: sha256(newSecret), expiresAt: expect.any(Date) },
      });
      expect(jwt.verify(result.accessToken)).toMatchObject({ sub: 7, sid: SESSION_ID });
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('logout / logoutAll', () => {
    it('logout faqat joriy sessiyani yopadi', async () => {
      await service.logout(SESSION_ID);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: SESSION_ID, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('logoutAll foydalanuvchining barcha faol sessiyalarini yopadi', async () => {
      await service.logoutAll(7);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 7, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('me', () => {
    it('foydalanuvchini parol xeshisiz qaytaradi', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      const result = await service.me(7);
      expect(result).toMatchObject({ id: 7, phone: user.phone });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('o‘chirilgan foydalanuvchi — 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.me(7)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('joriy parol noto‘g‘ri — 401, hech narsa o‘zgarmaydi', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(
        service.changePassword(7, SESSION_ID, { currentPassword: 'wrong', newPassword: 'newsecret' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('foydalanuvchi topilmasa — 401', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword(7, SESSION_ID, { currentPassword: PASSWORD, newPassword: 'newsecret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('parol yangilanadi, joriy sessiyadan boshqa hammasi yopiladi', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await service.changePassword(7, SESSION_ID, { currentPassword: PASSWORD, newPassword: 'newsecret' });

      const { data } = prisma.user.update.mock.calls[0][0];
      expect(await bcrypt.compare('newsecret', data.passwordHash)).toBe(true);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 7, revokedAt: null, id: { not: SESSION_ID } },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
