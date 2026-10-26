import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BalanceTxType, TopUp, TopUpMethod, TopUpStatus } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { paymeConfig } from './payment-config';
import { TopUpsService } from './topups.service';
import { InsufficientBalanceError, WalletService } from './wallet.service';

/**
 * Payme Merchant API (JSON-RPC 2.0) — balans to'ldirish uchun. Kassa sozlamasida hisob maydoni: `top_up_id`.
 * Autentifikatsiya: `Authorization: Basic base64("Paycom:" + PAYME_KEY)`. Summalar tiyinda (so'm × 100).
 * Holatlar: 1 yaratilgan, 2 bajarilgan (pul qo'shilgan), -1 bajarilmasdan bekor, -2 bajarilgandan keyin bekor.
 * Javob har doim HTTP 200; xato — `error` obyektida.
 */
export const PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000;

const msg = (uz: string, ru: string, en: string) => ({ uz, ru, en });
export const PAYME_ERRORS = {
  AUTH: { code: -32504, message: msg("Ruxsat yo'q", 'Недостаточно привилегий', 'Insufficient privileges') },
  METHOD: { code: -32601, message: msg('Metod topilmadi', 'Метод не найден', 'Method not found') },
  INVALID: { code: -32600, message: msg("So'rov noto'g'ri", 'Неверный запрос', 'Invalid request') },
  AMOUNT: { code: -31001, message: msg("Summa noto'g'ri", 'Неверная сумма', 'Invalid amount') },
  NOT_FOUND: { code: -31003, message: msg('Tranzaksiya topilmadi', 'Транзакция не найдена', 'Transaction not found') },
  CANNOT_CANCEL: { code: -31007, message: msg("Bekor qilib bo'lmaydi", 'Невозможно отменить транзакцию', 'Unable to cancel transaction') },
  CANNOT_PERFORM: { code: -31008, message: msg("Amalni bajarib bo'lmaydi", 'Невозможно выполнить операцию', 'Unable to perform operation') },
  ACCOUNT: { code: -31050, message: msg("To'ldirish so'rovi topilmadi", 'Заявка на пополнение не найдена', 'Top-up request not found'), data: 'top_up_id' },
  BUSY: { code: -31051, message: msg("So'rov boshqa to'lovni kutmoqda", 'Заявка ожидает другую оплату', 'Request awaits another payment'), data: 'top_up_id' },
} as const;

type PaymeError = { code: number; message: Record<string, string>; data?: string };
class RpcError extends Error {
  constructor(readonly error: PaymeError) {
    super(String(error.code));
  }
}

interface RpcRequest {
  id?: unknown;
  method?: unknown;
  params?: Record<string, unknown>;
}

const ms = (d: Date | null | undefined) => (d ? d.getTime() : 0);
const digest = (v: string) => createHash('sha256').update(v).digest();

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly topUps: TopUpsService,
    private readonly wallet: WalletService,
  ) {}

  /** Basic auth: login "Paycom", parol — kassa kaliti. Doimiy vaqtda solishtiriladi */
  authorized(header: string | undefined) {
    const payme = paymeConfig(this.config);
    if (!payme || !header?.startsWith('Basic ')) return false;
    const expected = Buffer.from(`Paycom:${payme.key}`).toString('base64');
    return timingSafeEqual(digest(header.slice(6).trim()), digest(expected));
  }

  async handle(authHeader: string | undefined, body: RpcRequest) {
    const id = body?.id ?? null;
    if (!this.authorized(authHeader)) return { id, error: PAYME_ERRORS.AUTH };
    if (!body || typeof body.method !== 'string' || typeof body.params !== 'object' || !body.params) {
      return { id, error: PAYME_ERRORS.INVALID };
    }
    try {
      return { id, result: await this.dispatch(body.method, body.params) };
    } catch (err) {
      if (err instanceof RpcError) return { id, error: err.error };
      this.logger.error(`Payme ${body.method}: ${(err as Error).message}`);
      return { id, error: PAYME_ERRORS.CANNOT_PERFORM };
    }
  }

  private dispatch(method: string, params: Record<string, unknown>) {
    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerform(params);
      case 'CreateTransaction':
        return this.create(params);
      case 'PerformTransaction':
        return this.perform(params);
      case 'CancelTransaction':
        return this.cancel(params);
      case 'CheckTransaction':
        return this.check(params);
      case 'GetStatement':
        return this.statement(params);
      default:
        throw new RpcError(PAYME_ERRORS.METHOD);
    }
  }

  /** account.top_up_id + summa: so'rov mavjud, PAYME usulida, to'lov kutmoqda va summa aynan mos */
  private async validateAccount(params: Record<string, unknown>) {
    const account = (params.account ?? {}) as Record<string, unknown>;
    const id = Number(account.top_up_id);
    const topUp = Number.isSafeInteger(id) && id > 0 ? await this.prisma.topUp.findFirst({ where: { id, method: TopUpMethod.PAYME } }) : null;
    if (!topUp || topUp.status !== TopUpStatus.PENDING) throw new RpcError(PAYME_ERRORS.ACCOUNT);
    if (params.amount !== topUp.amount * 100) throw new RpcError(PAYME_ERRORS.AMOUNT);
    return topUp;
  }

  private async checkPerform(params: Record<string, unknown>) {
    await this.validateAccount(params);
    return { allow: true };
  }

  private async byTransaction(params: Record<string, unknown>) {
    if (typeof params.id !== 'string' || !params.id) throw new RpcError(PAYME_ERRORS.INVALID);
    const topUp = await this.prisma.topUp.findUnique({
      where: { method_providerTransId: { method: TopUpMethod.PAYME, providerTransId: params.id } },
    });
    if (!topUp) throw new RpcError(PAYME_ERRORS.NOT_FOUND);
    return topUp;
  }

  private expired(t: TopUp) {
    return ms(t.createdOnProvider) > 0 && Date.now() - ms(t.createdOnProvider) > PAYME_TIMEOUT_MS;
  }

  /** 12 soatdan oshgan yaratilgan tranzaksiya: reason 4 bilan bekor, xato -31008 */
  private async expire(t: TopUp): Promise<never> {
    await this.prisma.topUp.updateMany({
      where: { id: t.id, providerState: 1 },
      data: { providerState: -1, status: TopUpStatus.CANCELLED, cancelledAt: new Date(), cancelReason: 4 },
    });
    throw new RpcError(PAYME_ERRORS.CANNOT_PERFORM);
  }

  private async create(params: Record<string, unknown>) {
    if (typeof params.id !== 'string' || !params.id || typeof params.time !== 'number') throw new RpcError(PAYME_ERRORS.INVALID);
    const existing = await this.prisma.topUp.findUnique({
      where: { method_providerTransId: { method: TopUpMethod.PAYME, providerTransId: params.id } },
    });
    if (existing) {
      if (existing.providerState !== 1) throw new RpcError(PAYME_ERRORS.CANNOT_PERFORM);
      if (this.expired(existing)) await this.expire(existing);
      return { create_time: ms(existing.createdOnProvider), transaction: String(existing.id), state: 1 };
    }

    const topUp = await this.validateAccount(params);
    // Bitta so'rov — bitta faol Payme tranzaksiyasi
    if (topUp.providerTransId && topUp.providerState === 1) throw new RpcError(PAYME_ERRORS.BUSY);
    const now = new Date();
    const { count } = await this.prisma.topUp.updateMany({
      where: { id: topUp.id, status: TopUpStatus.PENDING, OR: [{ providerTransId: null }, { providerState: { not: 1 } }] },
      data: { providerTransId: params.id, providerState: 1, providerCreatedAt: new Date(params.time), createdOnProvider: now },
    });
    if (!count) throw new RpcError(PAYME_ERRORS.BUSY);
    return { create_time: now.getTime(), transaction: String(topUp.id), state: 1 };
  }

  private async perform(params: Record<string, unknown>) {
    const topUp = await this.byTransaction(params);
    if (topUp.providerState === 2) {
      return { transaction: String(topUp.id), perform_time: ms(topUp.performedAt), state: 2 };
    }
    if (topUp.providerState !== 1) throw new RpcError(PAYME_ERRORS.CANNOT_PERFORM);
    if (this.expired(topUp)) await this.expire(topUp);

    const performedAt = new Date();
    const ledger = await this.prisma.$transaction((tx) =>
      this.topUps.creditFromProvider(tx, topUp.id, { providerState: 2, performedAt }),
    );
    if (!ledger) {
      // Parallel PerformTransaction: boshqasi allaqachon bajargan — o'sha natija qaytadi
      const fresh = await this.prisma.topUp.findUniqueOrThrow({ where: { id: topUp.id } });
      if (fresh.providerState !== 2) throw new RpcError(PAYME_ERRORS.CANNOT_PERFORM);
      return { transaction: String(fresh.id), perform_time: ms(fresh.performedAt), state: 2 };
    }
    return { transaction: String(topUp.id), perform_time: performedAt.getTime(), state: 2 };
  }

  private async cancel(params: Record<string, unknown>) {
    const topUp = await this.byTransaction(params);
    const reason = typeof params.reason === 'number' ? params.reason : null;
    const result = (t: TopUp) => ({ transaction: String(t.id), cancel_time: ms(t.cancelledAt), state: t.providerState });

    if (topUp.providerState === -1 || topUp.providerState === -2) return result(topUp);
    const cancelledAt = new Date();

    if (topUp.providerState === 1) {
      await this.prisma.topUp.updateMany({
        where: { id: topUp.id, providerState: 1 },
        data: { providerState: -1, status: TopUpStatus.CANCELLED, cancelledAt, cancelReason: reason },
      });
      return result(await this.prisma.topUp.findUniqueOrThrow({ where: { id: topUp.id } }));
    }

    // Bajarilgandan keyin bekor: qo'shilgan pul qaytarib olinadi. Mijoz uni sarflagan bo'lsa — -31007
    try {
      await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.topUp.updateMany({
          where: { id: topUp.id, providerState: 2 },
          data: { providerState: -2, status: TopUpStatus.REJECTED, cancelledAt, cancelReason: reason },
        });
        if (!count) return;
        await this.wallet.debit(tx, { userId: topUp.userId, amount: topUp.amount, type: BalanceTxType.TOPUP_REVERSAL, topUpId: topUp.id, note: topUp.code });
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) throw new RpcError(PAYME_ERRORS.CANNOT_CANCEL);
      throw err;
    }
    return result(await this.prisma.topUp.findUniqueOrThrow({ where: { id: topUp.id } }));
  }

  private async check(params: Record<string, unknown>) {
    const t = await this.byTransaction(params);
    return {
      create_time: ms(t.createdOnProvider),
      perform_time: ms(t.performedAt),
      cancel_time: ms(t.cancelledAt),
      transaction: String(t.id),
      state: t.providerState,
      reason: t.cancelReason,
    };
  }

  private async statement(params: Record<string, unknown>) {
    if (typeof params.from !== 'number' || typeof params.to !== 'number') throw new RpcError(PAYME_ERRORS.INVALID);
    const rows = await this.prisma.topUp.findMany({
      where: { method: TopUpMethod.PAYME, providerCreatedAt: { gte: new Date(params.from), lte: new Date(params.to) } },
      orderBy: { providerCreatedAt: 'asc' },
    });
    return {
      transactions: rows.map((t) => ({
        id: t.providerTransId,
        time: ms(t.providerCreatedAt),
        amount: t.amount * 100,
        account: { top_up_id: String(t.id) },
        create_time: ms(t.createdOnProvider),
        perform_time: ms(t.performedAt),
        cancel_time: ms(t.cancelledAt),
        transaction: String(t.id),
        state: t.providerState,
        reason: t.cancelReason,
      })),
    };
  }
}
