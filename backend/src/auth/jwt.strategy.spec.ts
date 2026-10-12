import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

describe('JwtStrategy', () => {
  const prisma = { session: { findUnique: jest.fn() } };
  const config = { getOrThrow: jest.fn().mockReturnValue('unit-test-secret') };
  const strategy = new JwtStrategy(config as unknown as ConfigService, prisma as unknown as PrismaService);
  const payload = { sub: 7, role: Role.TAILOR, sid: SESSION_ID };

  const session = (extra = {}) => ({
    id: SESSION_ID,
    userId: 7,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { id: 7, role: Role.TAILOR, isActive: true },
    ...extra,
  });

  it('faol sessiya — foydalanuvchi qaytadi', async () => {
    prisma.session.findUnique.mockResolvedValue(session());
    await expect(strategy.validate(payload)).resolves.toEqual({ id: 7, role: Role.TAILOR, sessionId: SESSION_ID });
  });

  it('rol tokendan emas, bazadan olinadi (rol o‘zgargan bo‘lsa eski token yangi rol bilan ishlaydi)', async () => {
    prisma.session.findUnique.mockResolvedValue(session({ user: { id: 7, role: Role.USER, isActive: true } }));
    await expect(strategy.validate({ ...payload, role: Role.SUPERADMIN })).resolves.toMatchObject({ role: Role.USER });
  });

  it.each([
    ['sessiya topilmadi', null],
    ['logout qilingan', session({ revokedAt: new Date() })],
    ['muddati o‘tgan', session({ expiresAt: new Date(Date.now() - 1000) })],
    ['boshqa foydalanuvchining sessiyasi', session({ userId: 8 })],
    ['foydalanuvchi bloklangan', session({ user: { id: 7, role: Role.TAILOR, isActive: false } })],
  ])('%s — 401', async (_, found) => {
    prisma.session.findUnique.mockResolvedValue(found);
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('JWT_ACCESS_SECRET bo‘lmasa ishga tushmaydi', () => {
    const broken = { getOrThrow: jest.fn(() => { throw new Error('JWT_ACCESS_SECRET'); }) };
    expect(() => new JwtStrategy(broken as unknown as ConfigService, prisma as unknown as PrismaService)).toThrow();
  });
});
