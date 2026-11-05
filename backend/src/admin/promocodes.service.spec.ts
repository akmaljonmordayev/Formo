import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PromocodeType } from '@prisma/client';
import { AuditService } from './audit.service';
import { PromocodesService } from './promocodes.service';
import { PrismaService } from '../prisma/prisma.service';

const promo = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  code: 'FORMO10',
  type: PromocodeType.PERCENT,
  value: 10,
  minSum: 0,
  usageCap: null,
  usedCount: 0,
  isActive: true,
  startsAt: null,
  endsAt: null,
  createdAt: new Date(),
  ...extra,
});

describe('PromocodesService', () => {
  const prisma = {
    promocode: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const audit = { log: jest.fn() };
  const service = new PromocodesService(prisma as unknown as PrismaService, audit as unknown as AuditService);

  beforeEach(() => jest.resetAllMocks());

  describe('create', () => {
    const input = { code: 'FORMO10', type: PromocodeType.PERCENT, value: 10 };

    it('kod band — 409, yaratilmaydi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(promo());
      await expect(service.create(input, null)).rejects.toThrow(ConflictException);
      expect(prisma.promocode.create).not.toHaveBeenCalled();
    });

    it('kod bo‘sh — yaratadi va sanalarni Date ga aylantiradi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(null);
      prisma.promocode.create.mockImplementation(async ({ data }) => ({ id: 2, ...data }));

      const result = await service.create({ ...input, startsAt: '2026-01-01T00:00:00Z' }, null);

      const { data } = prisma.promocode.create.mock.calls[0][0];
      expect(data.startsAt).toBeInstanceOf(Date);
      expect(result).toMatchObject({ code: 'FORMO10' });
    });

    it('audit jurnaliga yoziladi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(null);
      prisma.promocode.create.mockResolvedValue(promo());
      await service.create(input, { id: 1 } as never, '1.2.3.4');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Promokod yaratildi', context: 'FORMO10', ip: '1.2.3.4' }),
      );
    });

    it('PERCENT value 100dan katta — 400, yaratilmaydi (kod bandligi tekshirilmasdan)', async () => {
      await expect(service.create({ ...input, value: 101 }, null)).rejects.toThrow(BadRequestException);
      expect(prisma.promocode.findUnique).not.toHaveBeenCalled();
      expect(prisma.promocode.create).not.toHaveBeenCalled();
    });

    it('FIXED value 100dan katta — muammosiz yaratiladi (chegara faqat PERCENT uchun)', async () => {
      prisma.promocode.findUnique.mockResolvedValue(null);
      prisma.promocode.create.mockImplementation(async ({ data }) => ({ id: 2, ...data }));
      await expect(
        service.create({ code: 'FORMO50K', type: PromocodeType.FIXED, value: 50000 }, null),
      ).resolves.toMatchObject({ value: 50000 });
    });
  });

  describe('update', () => {
    it('topilmasa — 404, yangilanmaydi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(null);
      await expect(service.update(99, {}, null)).rejects.toThrow(NotFoundException);
      expect(prisma.promocode.update).not.toHaveBeenCalled();
    });

    it("endsAt=null berilsa — doimiy promokod qilib sanasi olib tashlanadi (undefined bilan chalkashmasin)", async () => {
      prisma.promocode.findUnique.mockResolvedValue(promo({ endsAt: new Date() }));
      prisma.promocode.update.mockImplementation(async ({ data }) => ({ ...promo(), ...data }));

      await service.update(1, { endsAt: null }, null);

      const { data } = prisma.promocode.update.mock.calls[0][0];
      expect(data.endsAt).toBeNull();
    });

    it('endsAt berilmasa (undefined) — mavjud sana o‘zgarmaydi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(promo());
      prisma.promocode.update.mockImplementation(async ({ data }) => ({ ...promo(), ...data }));

      await service.update(1, { value: 20 }, null);

      const { data } = prisma.promocode.update.mock.calls[0][0];
      expect(data.endsAt).toBeUndefined();
    });

    it('isActive false ga o‘zgarsa — "o‘chirildi" deb jurnalga yoziladi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(promo({ isActive: true }));
      prisma.promocode.update.mockResolvedValue(promo({ isActive: false }));

      await service.update(1, { isActive: false }, null);

      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "Promokod o'chirildi" }));
    });

    it('isActive true ga o‘zgarsa — "yoqildi" deb jurnalga yoziladi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(promo({ isActive: false }));
      prisma.promocode.update.mockResolvedValue(promo({ isActive: true }));

      await service.update(1, { isActive: true }, null);

      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'Promokod yoqildi' }));
    });

    it('isActive o‘zgarmasa — "tahrirlandi" deb jurnalga yoziladi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(promo({ isActive: true }));
      prisma.promocode.update.mockResolvedValue(promo({ isActive: true, value: 15 }));

      await service.update(1, { value: 15 }, null);

      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'Promokod tahrirlandi' }));
    });

    it('mavjud PERCENT promokodga 100dan katta value berilsa — 400, yangilanmaydi', async () => {
      prisma.promocode.findUnique.mockResolvedValue(promo({ type: PromocodeType.PERCENT }));
      await expect(service.update(1, { value: 150 }, null)).rejects.toThrow(BadRequestException);
      expect(prisma.promocode.update).not.toHaveBeenCalled();
    });

    it("type berilmasa — mavjud (DB'dagi) type bilan tekshiriladi", async () => {
      prisma.promocode.findUnique.mockResolvedValue(promo({ type: PromocodeType.PERCENT, value: 10 }));
      await expect(service.update(1, { value: 200 }, null)).rejects.toThrow(BadRequestException);
    });
  });
});
