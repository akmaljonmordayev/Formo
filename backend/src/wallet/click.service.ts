import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TopUpMethod, TopUpStatus } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { clickConfig } from './payment-config';
import { TopUpsService } from './topups.service';

/**
 * CLICK SHOP API (Prepare / Complete) — balans to'ldirish uchun.
 * merchant_trans_id = TopUp.id (to'lov havolasidagi transaction_param).
 *   Prepare:  sign = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 *   Complete: sign = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 * Pul faqat Complete (action=1, error=0) va to'g'ri imzo bilan qo'shiladi; takroriy Complete ikkinchi kirim bermaydi.
 */
export const CLICK_ERRORS = {
  OK: [0, 'Success'],
  SIGN: [-1, 'SIGN CHECK FAILED!'],
  AMOUNT: [-2, 'Incorrect parameter amount'],
  ACTION: [-3, 'Action not found'],
  ALREADY_PAID: [-4, 'Already paid'],
  NOT_FOUND: [-5, 'User does not exist'],
  NO_TRANSACTION: [-6, 'Transaction does not exist'],
  UPDATE_FAILED: [-7, 'Failed to update user'],
  BAD_REQUEST: [-8, 'Error in request from click'],
  CANCELLED: [-9, 'Transaction cancelled'],
} as const;

type ClickError = (typeof CLICK_ERRORS)[keyof typeof CLICK_ERRORS];
export type ClickParams = Record<string, string | undefined>;

const md5 = (v: string) => createHash('md5').update(v).digest('hex');
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a.toLowerCase());
  const y = Buffer.from(b.toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
};
const REQUIRED = ['click_trans_id', 'service_id', 'merchant_trans_id', 'amount', 'action', 'sign_time', 'sign_string'];

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly topUps: TopUpsService,
  ) {}

  private reply(p: ClickParams, [error, error_note]: ClickError, extra: Record<string, unknown> = {}) {
    return { click_trans_id: p.click_trans_id ?? null, merchant_trans_id: p.merchant_trans_id ?? null, ...extra, error, error_note };
  }

  /** Umumiy tekshiruvlar: sozlama, maydonlar, service_id, imzo, action */
  private verify(p: ClickParams, action: '0' | '1') {
    const click = clickConfig(this.config);
    if (!click) return CLICK_ERRORS.BAD_REQUEST;
    if (REQUIRED.some((k) => !p[k]) || (action === '1' && !p.merchant_prepare_id)) return CLICK_ERRORS.BAD_REQUEST;
    if (p.service_id !== click.serviceId) return CLICK_ERRORS.BAD_REQUEST;
    const base =
      action === '0'
        ? `${p.click_trans_id}${p.service_id}${click.secretKey}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`
        : `${p.click_trans_id}${p.service_id}${click.secretKey}${p.merchant_trans_id}${p.merchant_prepare_id}${p.amount}${p.action}${p.sign_time}`;
    if (!safeEqual(md5(base), p.sign_string!)) return CLICK_ERRORS.SIGN;
    if (p.action !== action) return CLICK_ERRORS.ACTION;
    return null;
  }

  private async findTopUp(p: ClickParams) {
    const id = Number(p.merchant_trans_id);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return this.prisma.topUp.findFirst({ where: { id, method: TopUpMethod.CLICK } });
  }

  private amountMatches(p: ClickParams, expected: number) {
    const amount = Number(p.amount);
    return Number.isFinite(amount) && Math.abs(amount - expected) < 0.01;
  }

  async prepare(p: ClickParams) {
    const invalid = this.verify(p, '0');
    if (invalid) return this.reply(p, invalid);
    const topUp = await this.findTopUp(p);
    if (!topUp) return this.reply(p, CLICK_ERRORS.NOT_FOUND);
    if (topUp.status === TopUpStatus.APPROVED) return this.reply(p, CLICK_ERRORS.ALREADY_PAID);
    if (topUp.status !== TopUpStatus.PENDING) return this.reply(p, CLICK_ERRORS.CANCELLED);
    if (!this.amountMatches(p, topUp.amount)) return this.reply(p, CLICK_ERRORS.AMOUNT);

    // Pul hali qo'shilmagan — mijoz qayta urinsa yangi click_trans_id yoziladi
    const { count } = await this.prisma.topUp.updateMany({
      where: { id: topUp.id, status: TopUpStatus.PENDING },
      data: { providerTransId: p.click_trans_id, createdOnProvider: new Date() },
    });
    if (!count) return this.reply(p, CLICK_ERRORS.CANCELLED);
    return this.reply(p, CLICK_ERRORS.OK, { merchant_prepare_id: topUp.id });
  }

  async complete(p: ClickParams) {
    const invalid = this.verify(p, '1');
    if (invalid) return this.reply(p, invalid);
    const topUp = await this.findTopUp(p);
    if (!topUp) return this.reply(p, CLICK_ERRORS.NOT_FOUND);
    if (String(topUp.id) !== p.merchant_prepare_id || topUp.providerTransId !== p.click_trans_id) {
      return this.reply(p, CLICK_ERRORS.NO_TRANSACTION);
    }
    if (topUp.status === TopUpStatus.APPROVED) return this.reply(p, CLICK_ERRORS.ALREADY_PAID, { merchant_confirm_id: topUp.id });
    if (topUp.status !== TopUpStatus.PENDING) return this.reply(p, CLICK_ERRORS.CANCELLED);
    if (!this.amountMatches(p, topUp.amount)) return this.reply(p, CLICK_ERRORS.AMOUNT);

    // Click to'lov amalga oshmaganini bildirdi (error < 0) — so'rov yopiladi, pul qo'shilmaydi
    if (Number(p.error ?? 0) < 0) {
      await this.prisma.topUp.updateMany({
        where: { id: topUp.id, status: TopUpStatus.PENDING },
        data: { status: TopUpStatus.CANCELLED, cancelledAt: new Date() },
      });
      return this.reply(p, CLICK_ERRORS.CANCELLED);
    }

    try {
      const ledger = await this.prisma.$transaction((tx) => this.topUps.creditFromProvider(tx, topUp.id, { performedAt: new Date() }));
      if (!ledger) return this.reply(p, CLICK_ERRORS.ALREADY_PAID, { merchant_confirm_id: topUp.id });
      return this.reply(p, CLICK_ERRORS.OK, { merchant_confirm_id: ledger.id });
    } catch (err) {
      this.logger.error(`Click complete ${topUp.code}: ${(err as Error).message}`);
      return this.reply(p, CLICK_ERRORS.UPDATE_FAILED);
    }
  }
}
