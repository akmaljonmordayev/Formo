import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotifyEvent = 'newOrder' | 'paymentFailed' | 'lateOrder' | 'lowStock' | 'newTopUp';

export const DEFAULT_NOTIFICATIONS = {
  newOrder: true,
  paymentFailed: true,
  lateOrder: true,
  lowStock: true,
  newTopUp: true, // balans to'ldirish cheki tekshiruvga keldi

  telegramChatId: '',
};

/** Zaxira shu miqdor yoki undan kam bo'lsa "past zaxira" xabari yuboriladi */
export const LOW_STOCK_THRESHOLD = 5;
const LATE_AFTER_MS = 21 * 60 * 60 * 1000;
const LATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Superadmin "Sozlamalar → Bildirishnomalar" (`admin.notifications`) ni Telegram'ga yetkazadi.
 * `TELEGRAM_BOT_TOKEN` va `telegramChatId` bo'lmasa hech narsa yuborilmaydi. Xato hech qachon chaqiruvchiga o'tmaydi.
 */
@Injectable()
export class NotifyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotifyService.name);
  private timer?: NodeJS.Timeout;
  private readonly alertedLate = new Set<number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get configured() {
    return Boolean(this.config.get<string>('TELEGRAM_BOT_TOKEN'));
  }

  onModuleInit() {
    if (!this.configured || this.config.get<string>('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => void this.checkLate(), LATE_CHECK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async settings() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'admin.notifications' } });
    const value = row?.value;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...DEFAULT_NOTIFICATIONS, ...(value as object) }
      : DEFAULT_NOTIFICATIONS;
  }

  /** Hodisa yoqilgan bo'lsa Telegram'ga yuboradi. `true` — yuborildi */
  async notify(event: NotifyEvent, text: string): Promise<boolean> {
    try {
      const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
      if (!token) return false;
      const settings = await this.settings();
      const chatId = String(settings.telegramChatId ?? '').trim();
      if (!settings[event] || !chatId) return false;
      return await this.send(token, chatId, text);
    } catch (err) {
      this.logger.warn(`Bildirishnoma yuborilmadi (${event}): ${(err as Error).message}`);
      return false;
    }
  }

  /** Superadmin "Sinab ko'rish" tugmasi: hodisa sozlamalaridan qat'i nazar yuboradi, natijani qaytaradi */
  async test(): Promise<{ sent: boolean; reason?: string }> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return { sent: false, reason: 'Serverda TELEGRAM_BOT_TOKEN sozlanmagan' };
    const chatId = String((await this.settings()).telegramChatId ?? '').trim();
    if (!chatId) return { sent: false, reason: 'Telegram chat ID kiritilmagan' };
    try {
      const sent = await this.send(token, chatId, '✅ Formo: bildirishnomalar ulandi');
      return sent ? { sent } : { sent, reason: 'Telegram xabarni qabul qilmadi (chat ID yoki bot huquqini tekshiring)' };
    } catch (err) {
      return { sent: false, reason: (err as Error).message };
    }
  }

  private async send(token: string, chatId: string, text: string) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  }

  /** Qabul qilingandan 21 soatdan ko'p o'tgan, tayyor bo'lmagan buyurtmalar — har biri haqida bir marta */
  async checkLate() {
    try {
      const late = await this.prisma.order.findMany({
        where: {
          status: { in: [OrderStatus.ACCEPTED, OrderStatus.PRINTING, OrderStatus.QUALITY_CHECK] },
          createdAt: { lt: new Date(Date.now() - LATE_AFTER_MS) },
        },
        select: { id: true, code: true },
      });
      const fresh = late.filter((o) => !this.alertedLate.has(o.id));
      if (!fresh.length) return;
      fresh.forEach((o) => this.alertedLate.add(o.id));
      await this.notify('lateOrder', `⏰ Kechikayotgan buyurtmalar: ${fresh.map((o) => o.code).join(', ')}`);
    } catch (err) {
      this.logger.warn(`Kechikkan buyurtmalarni tekshirib bo'lmadi: ${(err as Error).message}`);
    }
  }
}
