import { BadRequestException } from '@nestjs/common';
import { BalanceTxType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InsufficientBalanceError, WalletService } from './wallet.service';

describe('WalletService', () => {
  // Hamma yozish metodlari chaqiruvchining tranzaksiyasida ishlaydi — shu uchun `tx` mock qilinadi,
  // `prisma` esa faqat summary() kabi faqat o'qish metodlari uchun kerak.
  const tx = {
    user: { update: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    balanceTransaction: { create: jest.fn(), findUnique: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    user: { findUniqueOrThrow: jest.fn() },
    balanceTransaction: { findMany: jest.fn() },
  };
  const service = new WalletService(prisma as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  describe('credit', () => {
    it('balansni oshiradi va yangi balansni daftar yozuviga yozadi', async () => {
      tx.user.update.mockResolvedValue({ balance: 150_000 });
      tx.balanceTransaction.create.mockResolvedValue({ id: 1 });

      await service.credit(tx as never, { userId: 5, amount: 50_000, type: BalanceTxType.TOPUP, topUpId: 9 });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { balance: { increment: 50_000 } },
        select: { balance: true },
      });
      expect(tx.balanceTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 5,
          type: BalanceTxType.TOPUP,
          topUpId: 9,
          orderId: null,
          actorId: null,
          note: null,
          amount: 50_000,
          balanceAfter: 150_000,
        },
      });
    });

    it.each([0, -1, 1.5])('musbat butun bo‘lmagan summa (%d) — 400, bazaga tegilmaydi', async (amount) => {
      await expect(service.credit(tx as never, { userId: 5, amount, type: BalanceTxType.TOPUP })).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe('debit', () => {
    it('yetarli balans — shartli kamaytiradi va manfiy summali yozuv yaratadi', async () => {
      tx.user.updateMany.mockResolvedValue({ count: 1 });
      tx.user.findUniqueOrThrow.mockResolvedValue({ balance: 40_000 });
      tx.balanceTransaction.create.mockResolvedValue({ id: 2 });

      await service.debit(tx as never, { userId: 5, amount: 60_000, type: BalanceTxType.ORDER_PAYMENT, orderId: 3 });

      expect(tx.user.updateMany).toHaveBeenCalledWith({
        where: { id: 5, balance: { gte: 60_000 } },
        data: { balance: { decrement: 60_000 } },
      });
      expect(tx.balanceTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: -60_000, balanceAfter: 40_000, orderId: 3 }) }),
      );
    });

    it('balans yetarli emas — InsufficientBalanceError, yozuv yaratilmaydi (parallel so‘rovlar balansni manfiyga tushira olmasin)', async () => {
      tx.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.debit(tx as never, { userId: 5, amount: 999_999, type: BalanceTxType.ORDER_PAYMENT, orderId: 3 }),
      ).rejects.toThrow(InsufficientBalanceError);
      expect(tx.balanceTransaction.create).not.toHaveBeenCalled();
    });

    it('musbat bo‘lmagan summa — 400, bazaga tegilmaydi', async () => {
      await expect(service.debit(tx as never, { userId: 5, amount: -1, type: BalanceTxType.ORDER_PAYMENT })).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.user.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('refundOrder', () => {
    it('buyurtma topilmasa — null, hech narsa qilinmaydi', async () => {
      tx.order.findUnique.mockResolvedValue(null);

      expect(await service.refundOrder(tx as never, 10)).toBeNull();
      expect(tx.balanceTransaction.create).not.toHaveBeenCalled();
    });

    it('to‘lov yozuvi bo‘lmasa (naqd yoki hali to‘lanmagan) — null, pul qaytmaydi', async () => {
      tx.order.findUnique.mockResolvedValue({ code: 'FRM-000001' });
      tx.balanceTransaction.findUnique.mockResolvedValueOnce(null); // ORDER_PAYMENT yozuvi yo'q

      expect(await service.refundOrder(tx as never, 10)).toBeNull();
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('allaqachon qaytarilgan bo‘lsa (ORDER_REFUND bor) — ikkinchi marta qaytmaydi', async () => {
      tx.order.findUnique.mockResolvedValue({ code: 'FRM-000001' });
      tx.balanceTransaction.findUnique
        .mockResolvedValueOnce({ userId: 5, amount: -60_000 }) // ORDER_PAYMENT
        .mockResolvedValueOnce({ id: 99 }); // ORDER_REFUND — allaqachon mavjud

      expect(await service.refundOrder(tx as never, 10)).toBeNull();
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('to‘langan buyurtma — bir marta pul qaytadi va paymentStatus REFUNDED bo‘ladi', async () => {
      tx.order.findUnique.mockResolvedValue({ code: 'FRM-000001' });
      tx.balanceTransaction.findUnique
        .mockResolvedValueOnce({ userId: 5, amount: -60_000 }) // ORDER_PAYMENT: 60 000 yechilgan edi
        .mockResolvedValueOnce(null); // ORDER_REFUND hali yo'q
      tx.user.update.mockResolvedValue({ balance: 100_000 });
      tx.balanceTransaction.create.mockResolvedValue({ id: 3 });

      const result = await service.refundOrder(tx as never, 10, 7);

      expect(result).toBe(60_000);
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { balance: { increment: 60_000 } },
        select: { balance: true },
      });
      expect(tx.balanceTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: BalanceTxType.ORDER_REFUND, orderId: 10, actorId: 7, amount: 60_000 }),
        }),
      );
      expect(tx.order.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { paymentStatus: PaymentStatus.REFUNDED } });
    });
  });

  describe('summary', () => {
    it('joriy balans va oxirgi tranzaksiyalarni qaytaradi', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ balance: 25_000 });
      prisma.balanceTransaction.findMany.mockResolvedValue([{ id: 1, type: BalanceTxType.TOPUP, amount: 25_000 }]);

      const result = await service.summary(5, 5);

      expect(prisma.balanceTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 5 }, take: 5 }),
      );
      expect(result).toEqual({ balance: 25_000, transactions: [{ id: 1, type: BalanceTxType.TOPUP, amount: 25_000 }] });
    });
  });
});
