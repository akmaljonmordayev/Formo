import { OrderStatus, Prisma, TelegramMessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OUTBOX_MAX_ATTEMPTS, TelegramOutboxService } from './telegram-outbox.service';

describe('TelegramOutboxService', () => {
  const prisma = {
    order: { findUnique: jest.fn() },
    telegramOutbox: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    telegramAccount: { updateMany: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const service = new TelegramOutboxService(prisma as unknown as PrismaService);
  const db = prisma as unknown as Prisma.TransactionClient;
  const row = (over = {}) => ({ id: 3, chatId: '42', status: TelegramMessageStatus.PENDING, attempts: 1, ...over });

  beforeEach(() => jest.resetAllMocks());

  describe('enqueueOrderStatus', () => {
    it('ulangan mijozga holat xabari, dedupeKey holat yozuviga bog‘langan', async () => {
      prisma.order.findUnique.mockResolvedValue({ code: 'FRM-000012', customerId: 5, customer: { telegram: { chatId: '42' } } });
      await service.enqueueOrderStatus(db, 12, OrderStatus.PRINTING, 77);
      expect(prisma.telegramOutbox.create).toHaveBeenCalledWith({
        data: { userId: 5, chatId: '42', text: '📦 FRM-000012 buyurtmangiz holati: Bosilmoqda', dedupeKey: 'order-status:77' },
      });
    });

    it('ulanmagan / xabarlar o‘chirilgan mijoz va to‘lov kutilayotgan buyurtma — navbatga qo‘yilmaydi', async () => {
      prisma.order.findUnique.mockResolvedValue({ code: 'FRM-1', customerId: 5, customer: { telegram: { chatId: null } } });
      await service.enqueueOrderStatus(db, 12, OrderStatus.READY, 1);
      prisma.order.findUnique.mockResolvedValue({ code: 'FRM-1', customerId: 5, customer: { telegram: null } });
      await service.enqueueOrderStatus(db, 12, OrderStatus.READY, 2);
      await service.enqueueOrderStatus(db, 12, OrderStatus.PENDING_PAYMENT, 3);
      expect(prisma.telegramOutbox.create).not.toHaveBeenCalled();
    });
  });

  describe('report', () => {
    it('yakunlangan xabar uchun takroriy natija hech narsani o‘zgartirmaydi', async () => {
      prisma.telegramOutbox.findUnique.mockResolvedValue(row({ status: TelegramMessageStatus.SENT }));
      await service.report(3, 'FAILED');
      expect(prisma.telegramOutbox.updateMany).not.toHaveBeenCalled();
    });

    it('SENT — faqat PENDING holatdan', async () => {
      prisma.telegramOutbox.findUnique.mockResolvedValue(row());
      await service.report(3, 'SENT');
      const arg = prisma.telegramOutbox.updateMany.mock.calls[0][0];
      expect(arg.where).toEqual({ id: 3, status: TelegramMessageStatus.PENDING });
      expect(arg.data.status).toBe(TelegramMessageStatus.SENT);
    });

    it('RETRY — keyinroq; urinishlar tugasa FAILED', async () => {
      prisma.telegramOutbox.findUnique.mockResolvedValue(row({ attempts: 1 }));
      await service.report(3, 'RETRY', 'timeout');
      expect(prisma.telegramOutbox.updateMany.mock.calls[0][0].data.lockedUntil.getTime()).toBeGreaterThan(Date.now());

      prisma.telegramOutbox.findUnique.mockResolvedValue(row({ attempts: OUTBOX_MAX_ATTEMPTS }));
      await service.report(3, 'RETRY', 'timeout');
      expect(prisma.telegramOutbox.updateMany.mock.calls[1][0].data.status).toBe(TelegramMessageStatus.FAILED);
    });

    it('BLOCKED — xabar FAILED, shu chatga keyingi xabarlar o‘chiriladi', async () => {
      prisma.telegramOutbox.findUnique.mockResolvedValue(row());
      prisma.$transaction.mockResolvedValue([]);
      await service.report(3, 'BLOCKED');
      expect(prisma.telegramAccount.updateMany).toHaveBeenCalledWith({ where: { chatId: '42' }, data: { chatId: null } });
    });
  });
});
