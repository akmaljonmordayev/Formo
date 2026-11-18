import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asPushLang, pushText } from './push-texts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const FLUSH_MS = 5000;
const MAX_ATTEMPTS = 5;
const BATCH = 100; // Expo bitta so'rovda 100 tagacha xabar qabul qiladi
const TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export const isExpoPushToken = (token: string) => TOKEN_RE.test(token);

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Mobil ilova push bildirishnomalari (Expo Push API). Xabarlar `PushOutbox`ga holat o'zgarishi bilan bitta
 * tranzaksiyada yoziladi — tranzaksiya bekor bo'lsa xabar ham ketmaydi; fon jarayoni har 5 soniyada yuboradi.
 */
@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private timer?: NodeJS.Timeout;
  private flushing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => void this.flush(), FLUSH_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Qurilma tokenini saqlash (boshqa hisobda turgan bo'lsa — shu hisobga o'tadi) */
  async register(userId: number, token: string, language?: string, platform?: string) {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, language: asPushLang(language), platform: platform ?? null },
      update: { userId, language: asPushLang(language), platform: platform ?? null },
    });
    return { ok: true };
  }

  async unregister(userId: number, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }

  /** Buyurtma holati xabarini mijozning barcha qurilmalari uchun navbatga qo'yadi */
  async enqueueOrderStatus(db: Prisma.TransactionClient, orderId: number, status: OrderStatus, logId: number) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { code: true, customerId: true },
    });
    if (!order?.customerId) return;
    const tokens = await db.pushToken.findMany({ where: { userId: order.customerId }, select: { token: true, language: true } });
    for (const t of tokens) {
      const text = pushText(t.language, status, order.code);
      if (!text) continue;
      await db.pushOutbox.upsert({
        where: { dedupeKey: `order-status:${logId}:${t.token}` },
        create: {
          token: t.token,
          title: text.title,
          body: text.body,
          data: { type: 'order', orderId, status },
          dedupeKey: `order-status:${logId}:${t.token}`,
        },
        update: {},
      });
    }
  }

  async flush() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const rows = await this.prisma.pushOutbox.findMany({
        where: { sentAt: null, attempts: { lt: MAX_ATTEMPTS } },
        orderBy: { id: 'asc' },
        take: BATCH,
      });
      if (!rows.length) return;
      const tickets = await this.send(
        rows.map((r) => ({ to: r.token, title: r.title, body: r.body, data: r.data ?? {}, sound: 'default', priority: 'high', channelId: 'orders' })),
      );
      const now = new Date();
      await Promise.all(
        rows.map(async (row, i) => {
          const ticket = tickets?.[i];
          if (ticket?.status === 'ok') {
            await this.prisma.pushOutbox.update({ where: { id: row.id }, data: { sentAt: now, attempts: { increment: 1 } } });
            return;
          }
          // Ilova o'chirilgan / token yaroqsiz — token o'chiriladi, xabar qayta urinilmaydi
          const dead = ticket?.details?.error === 'DeviceNotRegistered';
          if (dead) await this.prisma.pushToken.deleteMany({ where: { token: row.token } });
          await this.prisma.pushOutbox.update({
            where: { id: row.id },
            data: {
              attempts: dead ? MAX_ATTEMPTS : { increment: 1 },
              lastError: (ticket?.message ?? 'Expo javob bermadi').slice(0, 500),
            },
          });
        }),
      );
    } catch (err) {
      this.logger.warn(`Push xabarlar yuborilmadi: ${(err as Error).message}`);
    } finally {
      this.flushing = false;
    }
  }

  private async send(messages: object[]): Promise<ExpoTicket[] | null> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: ExpoTicket[] };
      return Array.isArray(json.data) ? json.data : null;
    } catch {
      return null;
    }
  }
}
