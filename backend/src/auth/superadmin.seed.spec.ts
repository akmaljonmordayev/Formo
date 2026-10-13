import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SuperadminSeed } from './superadmin.seed';

describe('SuperadminSeed', () => {
  const prisma = { user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() } };
  let env: Record<string, string | undefined>;
  const config = { get: (key: string) => env[key] };
  const seed = new SuperadminSeed(prisma as unknown as PrismaService, config as unknown as ConfigService);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    env = { SUPERADMIN_PHONE: '+998 90 111 11 11', SUPERADMIN_PASSWORD: 'strong-password', SUPERADMIN_NAME: 'Boss' };
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
  });

  it('superadmin bor bo‘lsa — hech narsa qilmaydi (parol qayta yozilmaydi)', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1, role: Role.SUPERADMIN });
    await seed.onApplicationBootstrap();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('yo‘q bo‘lsa — normallashtirilgan raqam va xeshlangan parol bilan yaratadi', async () => {
    await seed.onApplicationBootstrap();

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data).toMatchObject({ phone: '+998901111111', fullName: 'Boss', role: Role.SUPERADMIN });
    expect(data).not.toHaveProperty('password');
    expect(await bcrypt.compare('strong-password', data.passwordHash)).toBe(true);
  });

  it('SUPERADMIN_NAME berilmasa — standart ism', async () => {
    env.SUPERADMIN_NAME = undefined;
    await seed.onApplicationBootstrap();
    expect(prisma.user.create.mock.calls[0][0].data.fullName).toBe('Super Admin');
  });

  it.each(['SUPERADMIN_PHONE', 'SUPERADMIN_PASSWORD'])('%s berilmasa — yaratilmaydi, server yiqilmaydi', async (key) => {
    env[key] = undefined;
    await expect(seed.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('raqam boshqa akkauntda band bo‘lsa — yaratilmaydi (mavjud akkaunt superadminga aylanmaydi)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, role: Role.USER });
    await seed.onApplicationBootstrap();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
