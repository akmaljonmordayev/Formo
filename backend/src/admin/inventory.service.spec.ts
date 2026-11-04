import { BadRequestException } from '@nestjs/common';
import { InventoryProductType } from '@prisma/client';
import { AuditService } from './audit.service';
import { InventoryOrderLine, InventoryService } from './inventory.service';
import { NotifyService } from '../notify/notify.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService — reserve/restore (checkout va bekor qilish)', () => {
  const tx = {
    inventoryItem: { findUnique: jest.fn(), updateMany: jest.fn() },
  };
  const audit = { log: jest.fn() };
  const notify = { notify: jest.fn() };
  const service = new InventoryService(
    {} as unknown as PrismaService,
    audit as unknown as AuditService,
    notify as unknown as NotifyService,
  );

  beforeEach(() => jest.resetAllMocks());

  const tshirtLine = (extra: Partial<InventoryOrderLine> = {}): InventoryOrderLine => ({
    kitId: 1,
    shirtSize: 'M',
    shortsSize: null,
    withShorts: false,
    quantity: 2,
    label: 'Real Madrid · Uy formasi',
    ...extra,
  });

  describe('reserve', () => {
    it('zaxira yozuvi mavjud va yetarli — shartli kamaytiradi', async () => {
      tx.inventoryItem.findUnique.mockResolvedValue({ id: 1, qty: 10 });
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 1 });

      await service.reserve(tx as never, [tshirtLine()]);

      expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith({
        where: { productType: InventoryProductType.TSHIRT, kitId: 1, size: 'M', qty: { gte: 2 } },
        data: { qty: { decrement: 2 } },
      });
    });

    it('zaxira yetarli emas — BadRequestException, butun so‘rov (tranzaksiya) bekor bo‘lishi uchun', async () => {
      tx.inventoryItem.findUnique.mockResolvedValue({ id: 1, qty: 1 });
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 0 }); // parallel so'rov bo'shatib qo'ygan / yetarli emas

      await expect(service.reserve(tx as never, [tshirtLine({ quantity: 5 })])).rejects.toThrow(BadRequestException);
    });

    it('InventoryItem yozuvi umuman yo‘q — kuzatilmagan deb hisoblanadi, cheklovsiz o‘tadi', async () => {
      tx.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.reserve(tx as never, [tshirtLine()])).resolves.toBeUndefined();
      expect(tx.inventoryItem.updateMany).not.toHaveBeenCalled();
    });

    it('shortik tanlangan bo‘lsa — futbolka va shortik alohida kamaytiriladi', async () => {
      tx.inventoryItem.findUnique.mockResolvedValue({ id: 1, qty: 10 });
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 1 });

      await service.reserve(tx as never, [tshirtLine({ withShorts: true, shortsSize: 'L' })]);

      expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ productType: InventoryProductType.TSHIRT, size: 'M' }) }),
      );
      expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ productType: InventoryProductType.SHORTS, size: 'L' }) }),
      );
      expect(tx.inventoryItem.updateMany).toHaveBeenCalledTimes(2);
    });

    it('kitId yo‘q qator (maxsus dizayn/3D dizayn) — ombor bilan bog‘lanmaydi', async () => {
      await service.reserve(tx as never, [tshirtLine({ kitId: null })]);
      expect(tx.inventoryItem.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('kuzatilayotgan o‘lcham — zaxira orqaga qaytadi', async () => {
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 1 });

      await service.restore(tx as never, [tshirtLine()]);

      expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith({
        where: { productType: InventoryProductType.TSHIRT, kitId: 1, size: 'M' },
        data: { qty: { increment: 2 } },
      });
    });

    it('shortik bilan buyurtma bekor qilinsa — ikkala o‘lcham ham qaytadi', async () => {
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 1 });

      await service.restore(tx as never, [tshirtLine({ withShorts: true, shortsSize: 'L' })]);

      expect(tx.inventoryItem.updateMany).toHaveBeenCalledTimes(2);
      expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ productType: InventoryProductType.SHORTS, size: 'L' }) }),
      );
    });

    it('yozuv mavjud bo‘lmasa — no-op (xato tashlanmaydi, hisob oshirilmaydi)', async () => {
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.restore(tx as never, [tshirtLine()])).resolves.toBeUndefined();
    });

    it('kitId yo‘q qator — ombor tegilmaydi', async () => {
      await service.restore(tx as never, [tshirtLine({ kitId: null })]);
      expect(tx.inventoryItem.updateMany).not.toHaveBeenCalled();
    });
  });
});
