import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, Role, TopUpMethod } from '@prisma/client';
import { NEW_CUSTOMER_NAME } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { STATUS_LABEL } from '../shop/order-status';
import { RulesService } from '../shop/rules.service';
import { TopUpsService } from '../wallet/topups.service';
import { WalletService } from '../wallet/wallet.service';

const FINAL: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED];

/**
 * Bot uchun hisob ma'lumotlari. Foydalanuvchi faqat tasdiqlangan Telegram ulanishi orqali aniqlanadi
 * (TelegramAccount — kontakt + ilovadagi kod bilan yozilgan). Bot hech qachon boshqa mijoz ma'lumotini,
 * telefon raqamini to'liq yoki chek fayli ID'sini olmaydi.
 */
@Injectable()
export class TelegramAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly topUps: TopUpsService,
    private readonly rules: RulesService,
  ) {}

  /** Ulangan, faol mijoz (xodim hisoblari botga ulanmaydi) yoki null */
  private async customer(telegramUserId: string) {
    const link = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId },
      select: { language: true, user: { select: { id: true, fullName: true, role: true, isActive: true, balance: true } } },
    });
    const user = link?.user;
    return user && user.isActive && user.role === Role.USER ? { ...user, language: link.language } : null;
  }

  async me(telegramUserId: string) {
    const user = await this.customer(telegramUserId);
    if (!user) return { linked: false as const };
    const activeOrders = await this.prisma.order.count({ where: { customerId: user.id, status: { notIn: FINAL } } });
    const name = user.fullName !== NEW_CUSTOMER_NAME ? user.fullName.split(/\s+/)[0] : null;
    return { linked: true as const, firstName: name, balance: user.balance, activeOrders, language: user.language };
  }

  /** Bot tili — faqat ulangan akkaunt uchun saqlanadi (backend xabarlari shu tilda yoziladi) */
  async setLanguage(telegramUserId: string, language: string) {
    const { count } = await this.prisma.telegramAccount.updateMany({ where: { telegramUserId }, data: { language } });
    return { linked: count > 0 };
  }

  async balance(telegramUserId: string) {
    const user = await this.customer(telegramUserId);
    if (!user) return { linked: false as const };
    const [wallet, topUps] = await Promise.all([this.wallet.summary(user.id, 5), this.topUps.list(user.id, 5)]);
    return { linked: true as const, ...wallet, topUps };
  }

  async orders(telegramUserId: string) {
    const user = await this.customer(telegramUserId);
    if (!user) return { linked: false as const };
    const rows = await this.prisma.order.findMany({
      where: { customerId: user.id },
      orderBy: { id: 'desc' },
      take: 5,
      select: { id: true, code: true, status: true, totalSum: true, paymentStatus: true, createdAt: true },
    });
    return {
      linked: true as const,
      orders: rows.map((o) => ({ ...o, statusLabel: STATUS_LABEL[o.status] })),
    };
  }

  methods() {
    return this.topUps.methods();
  }

  /** Natija kodi bilan — bot o'z tilida xabar beradi */
  async createTopUp(telegramUserId: string, amount: number, method: TopUpMethod) {
    const user = await this.customer(telegramUserId);
    if (!user) return { result: 'NOT_LINKED' as const };
    try {
      return { result: 'OK' as const, topUp: await this.topUps.create(user.id, amount, method) };
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS) return { result: 'TOO_MANY_OPEN' as const };
      if (err instanceof BadRequestException) {
        return { result: /summa/i.test(err.message) ? ('INVALID_AMOUNT' as const) : ('METHOD_UNAVAILABLE' as const) };
      }
      throw err;
    }
  }

  async attachReceipt(telegramUserId: string, fileId: string, fileUniqueId?: string) {
    const user = await this.customer(telegramUserId);
    if (!user) return { result: 'NOT_LINKED' as const };
    return this.topUps.attachReceipt(user.id, { fileId, uniqueId: fileUniqueId, telegramUserId });
  }

  async cancelTopUp(telegramUserId: string, topUpId: number) {
    const user = await this.customer(telegramUserId);
    if (!user) return { result: 'NOT_LINKED' as const };
    try {
      return { result: 'OK' as const, topUp: await this.topUps.cancel(user.id, topUpId) };
    } catch {
      return { result: 'NOT_CANCELLABLE' as const };
    }
  }

  /** Aloqa ma'lumotlari faqat superadmin "Umumiy" sozlamasidan — o'ylab topilmaydi */
  async support() {
    const g = await this.rules.general();
    return {
      phone: g.supportPhone || null,
      telegram: g.supportTelegram || null,
      email: g.supportEmail || null,
      workHours: g.workHoursFrom && g.workHoursTo ? `${g.workHoursFrom}–${g.workHoursTo}` : null,
    };
  }
}
