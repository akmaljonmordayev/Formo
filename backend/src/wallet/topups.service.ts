import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditCategory, BalanceTxType, Prisma, TopUp, TopUpMethod, TopUpStatus } from '@prisma/client';
import { AuditEntry, AuditService } from '../admin/audit.service';
import { NotifyService } from '../notify/notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { topUpTexts } from '../telegram/bot-texts';
import { TelegramOutboxService } from '../telegram/telegram-outbox.service';
import {
  clickConfig,
  DEFAULT_MANUAL,
  formatCard,
  MANUAL_SETTING_KEY,
  parseManualSettings,
  paymeConfig,
  topUpCode,
  TOPUP_DEDUPE_MS,
  TOPUP_MAX,
  TOPUP_MAX_OPEN,
  TOPUP_MIN,
} from './payment-config';
import { WalletService } from './wallet.service';

const OPEN: TopUpStatus[] = [TopUpStatus.PENDING, TopUpStatus.REVIEW];
// Bir so'rovni bir vaqtda bir necha admin bossa, qolganlari birinchisining qatori qulfini kutadi —
// standart 2 soniyalik maxWait'da ulanish olinmay 500 qaytardi; endi kutib, 409 oladi
const REVIEW_TX = { maxWait: 10_000, timeout: 15_000 };
const ADMIN_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      phone: true, // Telegram kontakti orqali tasdiqlangan raqam (kirish faqat shu yo'l bilan)
      balance: true,
      telegram: { select: { telegramUserId: true, linkedAt: true } },
    },
  },
} satisfies Prisma.TopUpInclude;
const som = (n: number) => `${n.toLocaleString('ru-RU')} so'm`;

export type TopUpView = ReturnType<typeof toTopUpView>;

/** Mijoz/bot uchun ko'rinish: provayder ichki maydonlari va chek fayli ID'si chiqmaydi */
export function toTopUpView(t: TopUp) {
  return {
    id: t.id,
    code: t.code,
    amount: t.amount,
    method: t.method,
    status: t.status,
    hasReceipt: Boolean(t.receiptFileId),
    rejectReason: t.status === TopUpStatus.REJECTED ? t.rejectReason : null,
    createdAt: t.createdAt,
  };
}

@Injectable()
export class TopUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
    private readonly outbox: TelegramOutboxService,
  ) {}

  private async manualSettings() {
    const row = await this.prisma.setting.findUnique({ where: { key: MANUAL_SETTING_KEY } });
    return row ? parseManualSettings(row.value) : DEFAULT_MANUAL;
  }

  /** Mijozga ko'rinadigan usullar: faqat haqiqatan sozlanganlari yoqiq */
  async methods() {
    const manual = await this.manualSettings();
    return {
      limits: { min: TOPUP_MIN, max: TOPUP_MAX },
      methods: [
        { method: TopUpMethod.MANUAL_CARD, enabled: Boolean(manual), automatic: false },
        { method: TopUpMethod.CLICK, enabled: Boolean(clickConfig(this.config)), automatic: true },
        { method: TopUpMethod.PAYME, enabled: Boolean(paymeConfig(this.config)), automatic: true },
      ],
    };
  }

  async create(userId: number, amount: number, method: TopUpMethod) {
    if (!Number.isSafeInteger(amount) || amount < TOPUP_MIN || amount > TOPUP_MAX) {
      throw new BadRequestException(`Summa ${som(TOPUP_MIN)} dan ${som(TOPUP_MAX)} gacha bo'lishi kerak`);
    }
    const available = (await this.methods()).methods.find((m) => m.method === method);
    if (!available?.enabled) throw new BadRequestException("Bu to'lov usuli hozircha mavjud emas");

    // Ikki marta bosish: yaqinda ochilgan xuddi shunday so'rov qaytariladi
    const recent = await this.prisma.topUp.findFirst({
      where: { userId, amount, method, status: TopUpStatus.PENDING, createdAt: { gte: new Date(Date.now() - TOPUP_DEDUPE_MS) } },
      orderBy: { id: 'desc' },
    });
    if (recent) return this.withInstructions(recent);

    const open = await this.prisma.topUp.count({ where: { userId, status: { in: OPEN } } });
    if (open >= TOPUP_MAX_OPEN) {
      throw new HttpException(
        `Sizda ${open} ta ochiq so'rov bor. Avval ularni yakunlang yoki bekor qiling`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const topUp = await this.prisma.$transaction(async (tx) => {
      const created = await tx.topUp.create({ data: { userId, amount, method, code: `TMP-${userId}-${Date.now()}` } });
      return tx.topUp.update({ where: { id: created.id }, data: { code: topUpCode(created.id) } });
    });
    return this.withInstructions(topUp);
  }

  /** To'lov yo'riqnomasi: qo'lda — rekvizitlar va izoh kodi, Click/Payme — to'lov sahifasi havolasi */
  async withInstructions(topUp: TopUp) {
    const view = toTopUpView(topUp);
    if (topUp.method === TopUpMethod.MANUAL_CARD) {
      const manual = await this.manualSettings();
      if (!manual) throw new BadRequestException("Qo'lda to'lov hozircha mavjud emas");
      return {
        ...view,
        instructions: {
          type: 'MANUAL' as const,
          cardNumber: formatCard(manual.cardNumber),
          cardHolder: manual.cardHolder,
          bankName: manual.bankName ?? null,
          note: manual.note ?? null,
          comment: topUp.code,
        },
      };
    }
    const returnUrl = this.config.get<string>('PAYMENT_RETURN_URL')?.trim();
    if (topUp.method === TopUpMethod.CLICK) {
      const click = clickConfig(this.config);
      if (!click) throw new BadRequestException("Click hozircha ulanmagan");
      const params = new URLSearchParams({
        service_id: click.serviceId,
        merchant_id: click.merchantId,
        amount: String(topUp.amount),
        transaction_param: String(topUp.id),
        ...(returnUrl && { return_url: returnUrl }),
      });
      return { ...view, instructions: { type: 'REDIRECT' as const, payUrl: `https://my.click.uz/services/pay?${params}` } };
    }
    const payme = paymeConfig(this.config);
    if (!payme) throw new BadRequestException('Payme hozircha ulanmagan');
    const parts = [`m=${payme.merchantId}`, `ac.top_up_id=${topUp.id}`, `a=${topUp.amount * 100}`, ...(returnUrl ? [`c=${returnUrl}`] : [])];
    return {
      ...view,
      instructions: { type: 'REDIRECT' as const, payUrl: `${payme.checkoutUrl}/${Buffer.from(parts.join(';')).toString('base64')}` },
    };
  }

  async list(userId: number, take = 5) {
    const rows = await this.prisma.topUp.findMany({ where: { userId }, orderBy: { id: 'desc' }, take });
    return rows.map(toTopUpView);
  }

  /**
   * Bot: mijoz chek rasmini yubordi — oxirgi ochiq qo'lda so'rovga biriktiriladi (qayta yuborilsa almashtiriladi).
   * Pul qo'shilmaydi. Xuddi shu rasm (file_unique_id) boshqa so'rovda ishlatilgan bo'lsa — DUPLICATE.
   */
  async attachReceipt(userId: number, receipt: { fileId: string; uniqueId?: string; telegramUserId: string }) {
    const topUp = await this.prisma.topUp.findFirst({
      where: { userId, method: TopUpMethod.MANUAL_CARD, status: { in: OPEN } },
      orderBy: { id: 'desc' },
    });
    if (!topUp) return { result: 'NO_OPEN_TOPUP' as const };
    if (receipt.uniqueId) {
      const used = await this.prisma.topUp.findUnique({ where: { receiptUniqueId: receipt.uniqueId }, select: { id: true } });
      if (used && used.id !== topUp.id) return { result: 'DUPLICATE_RECEIPT' as const };
    }
    let count: number;
    try {
      ({ count } = await this.prisma.topUp.updateMany({
        where: { id: topUp.id, status: { in: OPEN } },
        data: {
          receiptFileId: receipt.fileId,
          receiptUniqueId: receipt.uniqueId ?? null,
          receiptTelegramUserId: receipt.telegramUserId,
          receiptSubmittedAt: new Date(),
          status: TopUpStatus.REVIEW,
        },
      }));
    } catch (err) {
      // Parallel yuborilgan bir xil rasm — unikal indeks ushlaydi
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return { result: 'DUPLICATE_RECEIPT' as const };
      throw err;
    }
    if (!count) return { result: 'NO_OPEN_TOPUP' as const };
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, phone: true } });
    void this.notify.notify('newTopUp', `💳 To'ldirish tekshiruvga: ${topUp.code} · ${som(topUp.amount)} · ${user?.fullName ?? `#${userId}`}`);
    return { result: 'OK' as const, topUp: toTopUpView({ ...topUp, status: TopUpStatus.REVIEW, receiptFileId: receipt.fileId }) };
  }

  async cancel(userId: number, id: number) {
    const { count } = await this.prisma.topUp.updateMany({
      // Provayderda boshlangan tranzaksiyani mijoz bekor qila olmaydi — buni Click/Payme hal qiladi
      where: { id, userId, status: { in: OPEN }, providerTransId: null },
      data: { status: TopUpStatus.CANCELLED, cancelledAt: new Date() },
    });
    if (!count) throw new ConflictException("So'rovni bekor qilib bo'lmaydi");
    return toTopUpView(await this.prisma.topUp.findUniqueOrThrow({ where: { id } }));
  }

  // ---- Admin ----

  /**
   * Admin ko'rinishi: so'rov egasi (Formo akkaunti, tasdiqlangan telefon), uning hozirgi Telegram ulanishi va
   * chekni yuborgan Telegram akkaunti. `linkWarning` — ulanish yo'q yoki chek boshqa akkauntdan kelgan.
   */
  private async adminViews(rows: Prisma.TopUpGetPayload<{ include: typeof ADMIN_INCLUDE }>[]) {
    const reviewerIds = [...new Set(rows.map((r) => r.reviewedById).filter((v): v is number => v != null))];
    const reviewers = reviewerIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, fullName: true } })
      : [];
    const names = new Map(reviewers.map((r) => [r.id, r.fullName]));
    return rows.map(({ user, ...t }) => {
      const { telegram, ...owner } = user;
      const linkedId = telegram?.telegramUserId ?? null;
      return {
        ...toTopUpView(t),
        requestedAmount: t.requestedAmount,
        receiptSubmittedAt: t.receiptSubmittedAt,
        receiptTelegramUserId: t.receiptTelegramUserId,
        reviewedAt: t.reviewedAt,
        reviewedBy: t.reviewedById ? { id: t.reviewedById, fullName: names.get(t.reviewedById) ?? null } : null,
        providerTransId: t.providerTransId,
        user: owner,
        telegram: telegram ? { telegramUserId: linkedId, linkedAt: telegram.linkedAt } : null,
        linkWarning: !linkedId ? 'NOT_LINKED' : t.receiptTelegramUserId && t.receiptTelegramUserId !== linkedId ? 'LINK_CHANGED' : null,
      };
    });
  }

  async adminList(query: { status?: TopUpStatus; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;
    const where: Prisma.TopUpWhereInput = status ? { status } : {};
    const [items, total, counts] = await Promise.all([
      this.prisma.topUp.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit, include: ADMIN_INCLUDE }),
      this.prisma.topUp.count({ where }),
      this.prisma.topUp.groupBy({ by: ['status'], _count: true }),
    ]);
    return {
      items: await this.adminViews(items),
      total,
      page,
      limit,
      byStatus: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    };
  }

  /**
   * Faqat qo'lda to'lov va faqat chek yuborilgandan keyin (REVIEW). Holat sharti bilan atomik — ikki admin
   * bir vaqtda bossa ham bir marta qo'shiladi. `amount` — chekdagi haqiqiy summa so'rovdan farq qilsa.
   */
  async approve(id: number, actor: NonNullable<AuditEntry['actor']>, ip?: string, amount?: number) {
    if (amount != null && (!Number.isSafeInteger(amount) || amount < TOPUP_MIN || amount > TOPUP_MAX)) {
      throw new BadRequestException(`Summa ${som(TOPUP_MIN)} dan ${som(TOPUP_MAX)} gacha bo'lishi kerak`);
    }
    const topUp = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.topUp.updateMany({
        where: { id, method: TopUpMethod.MANUAL_CARD, status: TopUpStatus.REVIEW, receiptFileId: { not: null } },
        data: { status: TopUpStatus.APPROVED, reviewedById: actor.id, reviewedAt: new Date() },
      });
      if (!count) throw new ConflictException("So'rov allaqachon ko'rib chiqilgan yoki chek hali yuborilmagan");
      let row = await tx.topUp.findUniqueOrThrow({ where: { id } });
      if (amount != null && amount !== row.amount) {
        row = await tx.topUp.update({ where: { id }, data: { amount, requestedAmount: row.amount } });
      }
      const ledger = await this.wallet.credit(tx, {
        userId: row.userId,
        amount: row.amount,
        type: BalanceTxType.TOPUP,
        topUpId: row.id,
        actorId: actor.id,
        note: row.code,
      });
      await this.outbox.enqueueForUser(
        tx,
        row.userId,
        (lang) => topUpTexts.approved(lang, row.code, row.amount, ledger.balanceAfter),
        `topup:${row.id}:approved`,
      );
      return row;
    }, REVIEW_TX);
    const corrected = topUp.requestedAmount != null ? ` (so'ralgan ${topUp.requestedAmount})` : '';
    await this.audit.log({
      actor,
      action: "Balans to'ldirildi (qo'lda tasdiq)",
      category: AuditCategory.PAYMENT,
      context: `${topUp.code} · ${topUp.amount}${corrected} · user #${topUp.userId}`,
      ip,
    });
    return this.adminGet(id);
  }

  async reject(id: number, reason: string, actor: NonNullable<AuditEntry['actor']>, ip?: string) {
    const topUp = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.topUp.updateMany({
        where: { id, method: TopUpMethod.MANUAL_CARD, status: { in: OPEN } },
        data: { status: TopUpStatus.REJECTED, rejectReason: reason, reviewedById: actor.id, reviewedAt: new Date() },
      });
      if (!count) throw new ConflictException("So'rov allaqachon ko'rib chiqilgan yoki qo'lda to'lov emas");
      const row = await tx.topUp.findUniqueOrThrow({ where: { id } });
      await this.outbox.enqueueForUser(tx, row.userId, (lang) => topUpTexts.rejected(lang, row.code, reason), `topup:${row.id}:rejected`);
      return row;
    }, REVIEW_TX);
    await this.audit.log({ actor, action: "To'ldirish rad etildi", category: AuditCategory.PAYMENT, context: `${topUp.code} · ${reason}`, ip });
    return this.adminGet(id);
  }

  async adminGet(id: number) {
    const t = await this.prisma.topUp.findUnique({ where: { id }, include: ADMIN_INCLUDE });
    if (!t) throw new NotFoundException("So'rov topilmadi");
    return (await this.adminViews([t]))[0];
  }

  /** Admin chekni ko'rishi uchun Telegram fayli (fayl serverda saqlanmaydi) */
  async receiptFileId(id: number) {
    const t = await this.prisma.topUp.findUnique({ where: { id }, select: { receiptFileId: true } });
    if (!t) throw new NotFoundException("So'rov topilmadi");
    if (!t.receiptFileId) throw new NotFoundException('Chek yuborilmagan');
    return t.receiptFileId;
  }

  /**
   * To'lov tizimi (Click/Payme) to'lovni tasdiqladi — chaqiruvchi tranzaksiyasida.
   * Takroriy chaqiriqda ikkinchi kirim bo'lmaydi (holat sharti + ledger unikal kaliti).
   */
  async creditFromProvider(tx: Prisma.TransactionClient, topUpId: number, data: Prisma.TopUpUpdateManyMutationInput) {
    const { count } = await tx.topUp.updateMany({
      where: { id: topUpId, status: TopUpStatus.PENDING },
      data: { ...data, status: TopUpStatus.APPROVED },
    });
    if (!count) return null;
    const row = await tx.topUp.findUniqueOrThrow({ where: { id: topUpId } });
    const ledger = await this.wallet.credit(tx, { userId: row.userId, amount: row.amount, type: BalanceTxType.TOPUP, topUpId, note: row.code });
    await this.outbox.enqueueForUser(
      tx,
      row.userId,
      (lang) => topUpTexts.approved(lang, row.code, row.amount, ledger.balanceAfter),
      `topup:${row.id}:approved`,
    );
    return ledger;
  }
}
