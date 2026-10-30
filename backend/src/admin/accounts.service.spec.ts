import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';

const tailor = (extra: Partial<User> = {}) =>
  ({
    id: 3,
    phone: '+998903333333',
    passwordHash: 'hash',
    role: Role.TAILOR,
    fullName: 'Sardor',
    workshopName: 'Ipak Tikuv',
    isActive: true,
    ...extra,
  }) as User;

const prismaError = (code: string) => new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test' });

describe('AccountsService', () => {
  const tx = { user: { count: jest.fn(), findUnique: jest.fn(), create: jest.fn() } };
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const auth = { revokeAllSessions: jest.fn() };
  const service = new AccountsService(prisma as unknown as PrismaService, auth as unknown as AuthService);

  beforeEach(() => {
    jest.resetAllMocks();
    // Massiv ko'rinishi (list) va callback ko'rinishi (createSingle) — ikkalasi ham ishlatiladi
    prisma.$transaction.mockImplementation((arg) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg)));
  });

  describe('list', () => {
    beforeEach(() => {
      prisma.user.findMany.mockResolvedValue([tailor()]);
      prisma.user.count.mockResolvedValue(41);
    });

    it('standart sahifalash va faqat so‘ralgan rol', async () => {
      const result = await service.list(Role.TAILOR, {});

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.TAILOR },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result).toMatchObject({ total: 41, page: 1, limit: 20 });
      expect(result.items[0]).not.toHaveProperty('passwordHash');
    });

    it('page/limit dan skip hisoblanadi', async () => {
      await service.list(Role.USER, { page: 3, limit: 10 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
    });

    it('isActive filtri false bo‘lganda ham qo‘llanadi', async () => {
      await service.list(Role.USER, { isActive: false });
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: Role.USER, isActive: false } });
    });

    it('qidiruv: ism, sex nomi va telefon raqamlari bo‘yicha', async () => {
      await service.list(Role.TAILOR, { search: '90 333' });
      const { where } = prisma.user.findMany.mock.calls[0][0];
      expect(where.OR).toEqual([
        { fullName: { contains: '90 333', mode: 'insensitive' } },
        { workshopName: { contains: '90 333', mode: 'insensitive' } },
        { phone: { contains: '90333' } },
      ]);
    });

    it('qidiruvda raqam bo‘lmasa telefon sharti qo‘shilmaydi (aks holda hamma mos kelardi)', async () => {
      await service.list(Role.TAILOR, { search: 'Ipak' });
      const { where } = prisma.user.findMany.mock.calls[0][0];
      expect(where.OR).toHaveLength(2);
      expect(JSON.stringify(where.OR)).not.toContain('phone');
    });
  });

  describe('findOne / findSingle', () => {
    it('id va rol bo‘yicha qidiradi — boshqa roldagi akkaunt topilmaydi', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findOne(Role.TAILOR, 1)).rejects.toThrow(NotFoundException);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 1, role: Role.TAILOR } });
    });

    it('topilsa parol xeshisiz qaytaradi', async () => {
      prisma.user.findFirst.mockResolvedValue(tailor());
      expect(await service.findOne(Role.TAILOR, 3)).not.toHaveProperty('passwordHash');
    });

    it('findSingle: operator hali yaratilmagan — 404', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findSingle(Role.OPERATOR)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const input = { phone: '+998903333333', password: 'tailor-pass', fullName: 'Sardor', workshopName: 'Ipak Tikuv' };

    it('telefon band — 409', async () => {
      prisma.user.findUnique.mockResolvedValue(tailor({ id: 99 }));
      await expect(service.create(Role.TAILOR, input)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('berilgan rol bilan yaratadi, parol xeshlanadi', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }) => ({ id: 3, ...data }));

      const result = await service.create(Role.TAILOR, input);

      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.role).toBe(Role.TAILOR);
      expect(data).not.toHaveProperty('password');
      expect(await bcrypt.compare('tailor-pass', data.passwordHash)).toBe(true);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('createSingle (yagona operator)', () => {
    const input = { phone: '+998902222222', password: 'operator-pass', fullName: 'Dilshod' };

    it('Serializable tranzaksiyada yaratadi', async () => {
      tx.user.count.mockResolvedValue(0);
      tx.user.findUnique.mockResolvedValue(null);
      tx.user.create.mockImplementation(async ({ data }) => ({ id: 2, ...data }));

      const result = await service.createSingle(Role.OPERATOR, input);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      expect(tx.user.create.mock.calls[0][0].data).toMatchObject({ role: Role.OPERATOR, phone: input.phone });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('operator allaqachon bor — 409', async () => {
      tx.user.count.mockResolvedValue(1);
      await expect(service.createSingle(Role.OPERATOR, input)).rejects.toThrow(ConflictException);
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('telefon boshqa akkauntda band — 409', async () => {
      tx.user.count.mockResolvedValue(0);
      tx.user.findUnique.mockResolvedValue(tailor());
      await expect(service.createSingle(Role.OPERATOR, input)).rejects.toThrow(/telefon raqam band/);
    });

    it.each(['P2034', 'P2002'])('parallel so‘rov bilan to‘qnashuv (%s) — 500 emas, 409', async (code) => {
      prisma.$transaction.mockRejectedValue(prismaError(code));
      await expect(service.createSingle(Role.OPERATOR, input)).rejects.toThrow(ConflictException);
    });

    it('boshqa baza xatolari yutib yuborilmaydi', async () => {
      prisma.$transaction.mockRejectedValue(prismaError('P1001'));
      await expect(service.createSingle(Role.OPERATOR, input)).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(tailor());
      prisma.user.update.mockImplementation(async ({ data }) => ({ ...tailor(), ...data }));
    });

    it('boshqa roldagi akkaunt — 404, yangilanmaydi', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.update(Role.TAILOR, 3, { fullName: 'X' })).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('oddiy tahrir: sessiyalar yopilmaydi, parol xeshiga tegilmaydi', async () => {
      await service.update(Role.TAILOR, 3, { fullName: 'Yangi Ism' });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { fullName: 'Yangi Ism' } });
      expect(auth.revokeAllSessions).not.toHaveBeenCalled();
    });

    it('o‘z raqamini qayta yuborsa — band deb hisoblanmaydi', async () => {
      await service.update(Role.TAILOR, 3, { phone: '+998903333333' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('yangi raqam boshqa akkauntda band — 409', async () => {
      prisma.user.findUnique.mockResolvedValue(tailor({ id: 99, phone: '+998904444444' }));
      await expect(service.update(Role.TAILOR, 3, { phone: '+998904444444' })).rejects.toThrow(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('parol almashsa — xeshlanadi va barcha sessiyalar yopiladi', async () => {
      await service.update(Role.TAILOR, 3, { password: 'new-password' });

      const { data } = prisma.user.update.mock.calls[0][0];
      expect(data).not.toHaveProperty('password');
      expect(await bcrypt.compare('new-password', data.passwordHash)).toBe(true);
      expect(auth.revokeAllSessions).toHaveBeenCalledWith(3);
    });

    it('bloklansa — barcha sessiyalar yopiladi; blokdan chiqarilsa — yo‘q', async () => {
      await service.update(Role.TAILOR, 3, { isActive: false });
      expect(auth.revokeAllSessions).toHaveBeenCalledWith(3);

      auth.revokeAllSessions.mockClear();
      await service.update(Role.TAILOR, 3, { isActive: true });
      expect(auth.revokeAllSessions).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('topilmasa — 404, o‘chirilmaydi', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.remove(Role.USER, 3)).rejects.toThrow(NotFoundException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('rol mos kelsa o‘chiradi', async () => {
      prisma.user.findFirst.mockResolvedValue(tailor());
      await expect(service.remove(Role.TAILOR, 3)).resolves.toEqual({ message: expect.any(String) });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    });

    it('hamyon tarixi bo‘lsa (FK) — 409', async () => {
      prisma.user.findFirst.mockResolvedValue(tailor());
      prisma.user.delete.mockRejectedValue(prismaError('P2003'));
      await expect(service.remove(Role.TAILOR, 3)).rejects.toThrow(ConflictException);
    });
  });
});
