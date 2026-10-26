import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, TelegramMessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asBotLang, BotLang, orderStatusText } from './bot-texts';
import { OutboxResult } from './dto/telegram.dto';

/** Bot xabarni olib ketgandan keyin shu vaqt ichida natija qaytarmasa, xabar qayta beriladi */
export const OUTBOX_LEASE_SEC = 60;
export const OUTBOX_MAX_ATTEMPTS = 5;
const RETRY_BASE_SEC = 30;

export interface LeasedMessage {
  id: number;
  chatId: string;
  text: string;
  attempts: number;
}

/**
 * Foydalanuvchiga Telegram xabarlari navbati. Backend Telegram'ga o'zi yozmaydi —
 * telegram-bot servisi lease() bilan oladi, yuboradi va report() bilan natijani qaytaradi.
 * Yetkazish kafolati "kamida bir marta": bot javobi yo'qolsa xabar qayta yuborilishi mumkin.
 */
@Injectable()
export class TelegramOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Buyurtma holati o'zgarganda (OrderHistoryService ichida, o'sha tranzaksiyada) chaqiriladi */
  async enqueueOrderStatus(db: Prisma.TransactionClient, orderId: number, status: OrderStatus, logId: number) {
    // To'lanmagan buyurtma hali mijoz uchun "qabul qilingan" emas
    if (status === OrderStatus.PENDING_PAYMENT) return;
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { code: true, customerId: true, customer: { select: { telegram: { select: { chatId: true, language: true } } } } },
    });
    const telegram = order?.customer?.telegram;
    if (!order || !telegram?.chatId) return;
    await db.telegramOutbox.create({
      data: {
        userId: order.customerId,
        chatId: telegram.chatId,
        text: orderStatusText(asBotLang(telegram.language), order.code, status),
        dedupeKey: `order-status:${logId}`,
      },
    });
  }

  /**
   * Ixtiyoriy matnli xabar (masalan to'ldirish tasdiqlandi). Botga ulanmagan yoki xabarlarni o'chirgan
   * mijozga hech narsa yozilmaydi. dedupeKey — bir hodisa uchun bitta xabar.
   */
  async enqueueForUser(
    db: Prisma.TransactionClient,
    userId: number,
    text: string | ((lang: BotLang) => string),
    dedupeKey: string,
  ) {
    const account = await db.telegramAccount.findUnique({ where: { userId }, select: { chatId: true, language: true } });
    if (!account?.chatId) return;
    const body = typeof text === 'function' ? text(asBotLang(account.language)) : text;
    await db.telegramOutbox.upsert({
      where: { dedupeKey },
      create: { userId, chatId: account.chatId, text: body, dedupeKey },
      update: {},
    });
  }

  /** Navbatdagi xabarlarni band qiladi; SKIP LOCKED — bir nechta bot nusxasi bir xabarni olmaydi */
  async lease(limit = 20): Promise<LeasedMessage[]> {
    const rows = await this.prisma.$queryRaw<LeasedMessage[]>`
      UPDATE "TelegramOutbox"
      SET "lockedUntil" = (NOW() AT TIME ZONE 'UTC') + make_interval(secs => ${OUTBOX_LEASE_SEC}),
          "attempts" = "attempts" + 1
      WHERE "id" IN (
        SELECT "id" FROM "TelegramOutbox"
        WHERE "status" = 'PENDING' AND ("lockedUntil" IS NULL OR "lockedUntil" < (NOW() AT TIME ZONE 'UTC'))
        ORDER BY "id"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "chatId", "text", "attempts"`;
    return rows.sort((a, b) => a.id - b.id);
  }

  /** Idempotent: allaqachon yakunlangan xabar uchun takroriy natija e'tiborsiz qoldiriladi */
  async report(id: number, result: OutboxResult, error?: string) {
    const row = await this.prisma.telegramOutbox.findUnique({ where: { id } });
    if (!row || row.status !== TelegramMessageStatus.PENDING) return { ok: true };
    const pending = { id, status: TelegramMessageStatus.PENDING };
    const lastError = error?.slice(0, 300) ?? null;

    if (result === 'SENT') {
      await this.prisma.telegramOutbox.updateMany({
        where: pending,
        data: { status: TelegramMessageStatus.SENT, sentAt: new Date(), lockedUntil: null, lastError: null },
      });
    } else if (result === 'RETRY' && row.attempts < OUTBOX_MAX_ATTEMPTS) {
      const delaySec = RETRY_BASE_SEC * 2 ** Math.max(0, row.attempts - 1);
      await this.prisma.telegramOutbox.updateMany({
        where: pending,
        data: { lockedUntil: new Date(Date.now() + delaySec * 1000), lastError },
      });
    } else if (result === 'BLOCKED') {
      // Foydalanuvchi botni bloklagan: keyingi xabarlar navbatga qo'yilmaydi, /start bosganda qayta yoqiladi
      await this.prisma.$transaction([
        this.prisma.telegramOutbox.updateMany({
          where: pending,
          data: { status: TelegramMessageStatus.FAILED, lockedUntil: null, lastError: lastError ?? 'blocked' },
        }),
        this.prisma.telegramAccount.updateMany({ where: { chatId: row.chatId }, data: { chatId: null } }),
      ]);
    } else {
      await this.prisma.telegramOutbox.updateMany({
        where: pending,
        data: { status: TelegramMessageStatus.FAILED, lockedUntil: null, lastError },
      });
    }
    return { ok: true };
  }
}
