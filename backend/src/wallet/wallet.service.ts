import { BadRequestException, Injectable } from '@nestjs/common';
import { BalanceTxType, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class InsufficientBalanceError extends BadRequestException {
  constructor() {
    super("Balansda mablag' yetarli emas");
  }
}

interface Movement {
  userId: number;
  amount: number; // har doim musbat
  type: BalanceTxType;
  topUpId?: number;
  orderId?: number;
  actorId?: number | null;
  note?: string;
}

/**
 * Ichki balans — yagona kirish nuqtasi. Hamma metodlar chaqiruvchining tranzaksiyasida ishlaydi:
 * balans va daftar yozuvi birga o'zgaradi yoki birga qaytadi.
 *
 * Ikki marta hisoblashdan himoya bazada: BalanceTransaction (type, topUpId) va (type, orderId) unikal —
 * takroriy kirim P2002 bilan butun tranzaksiyani bekor qiladi. Manfiy balans: shartli UPDATE va CHECK.
 */
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async credit(db: Prisma.TransactionClient, m: Movement) {
    this.assertAmount(m.amount);
    const user = await db.user.update({
      where: { id: m.userId },
      data: { balance: { increment: m.amount } },
      select: { balance: true },
    });
    return db.balanceTransaction.create({
      data: { ...this.refs(m), amount: m.amount, balanceAfter: user.balance },
    });
  }

  async debit(db: Prisma.TransactionClient, m: Movement) {
    this.assertAmount(m.amount);
    // Faqat yetarli mablag' bo'lsa yechiladi — parallel so'rovlar balansni manfiyga tushira olmaydi
    const { count } = await db.user.updateMany({
      where: { id: m.userId, balance: { gte: m.amount } },
      data: { balance: { decrement: m.amount } },
    });
    if (!count) throw new InsufficientBalanceError();
    const { balance } = await db.user.findUniqueOrThrow({ where: { id: m.userId }, select: { balance: true } });
    return db.balanceTransaction.create({
      data: { ...this.refs(m), amount: -m.amount, balanceAfter: balance },
    });
  }

  /**
   * Balansdan to'langan buyurtma bekor qilinsa/qaytarilsa — pul bir marta qaytadi.
   * To'lov yozuvi bo'lmasa (naqd, to'lanmagan) hech narsa qilinmaydi. Qaytarilgan summa yoki null.
   */
  async refundOrder(db: Prisma.TransactionClient, orderId: number, actorId?: number | null) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { customerId: true, paymentMethod: true, code: true },
    });
    if (!order || order.paymentMethod !== PaymentMethod.BALANCE) return null;
    const paid = await db.balanceTransaction.findUnique({
      where: { type_orderId: { type: BalanceTxType.ORDER_PAYMENT, orderId } },
    });
    if (!paid) return null;
    const already = await db.balanceTransaction.findUnique({
      where: { type_orderId: { type: BalanceTxType.ORDER_REFUND, orderId } },
    });
    if (already) return null;
    await this.credit(db, {
      userId: paid.userId,
      amount: -paid.amount,
      type: BalanceTxType.ORDER_REFUND,
      orderId,
      actorId,
      note: order.code,
    });
    await db.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.REFUNDED } });
    return -paid.amount;
  }

  async summary(userId: number, take = 10) {
    const [user, transactions] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } }),
      this.prisma.balanceTransaction.findMany({
        where: { userId },
        orderBy: { id: 'desc' },
        take,
        select: { id: true, type: true, amount: true, balanceAfter: true, note: true, createdAt: true },
      }),
    ]);
    return { balance: user.balance, transactions };
  }

  private refs(m: Movement) {
    return {
      userId: m.userId,
      type: m.type,
      topUpId: m.topUpId ?? null,
      orderId: m.orderId ?? null,
      actorId: m.actorId ?? null,
      note: m.note?.slice(0, 200) ?? null,
    };
  }

  private assertAmount(amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new BadRequestException("Summa noto'g'ri");
  }
}
