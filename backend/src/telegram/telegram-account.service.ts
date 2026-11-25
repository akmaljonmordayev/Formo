import { Injectable } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import { NEW_CUSTOMER_NAME } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { asBotLang, orderStatusLabel } from './bot-texts';
import { RulesService } from '../shop/rules.service';

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

  /** `me()`ning yengil versiyasi — faqat menyu/til uchun kerak bo'lgan maydonlar, buyurtmalar soni so'ralmaydi */
  async status(telegramUserId: string) {
    const user = await this.customer(telegramUserId);
    return user ? { linked: true as const, language: user.language } : { linked: false as const };
  }

  /** Bot tili: ulangan akkauntda va ochiq kirish so'rovlarida (ulanganda akkauntga o'tadi) saqlanadi */
  async setLanguage(telegramUserId: string, language: string) {
    await this.prisma.telegramAuthChallenge.updateMany({
      where: { telegramUserId, consumedAt: null, failedAt: null, expiresAt: { gt: new Date() } },
      data: { language },
    });
    const { count } = await this.prisma.telegramAccount.updateMany({ where: { telegramUserId }, data: { language } });
    return { linked: count > 0 };
  }

  async balance(telegramUserId: string) {
    const user = await this.customer(telegramUserId);
    if (!user) return { linked: false as const };
    return { linked: true as const, balance: user.balance };
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
      orders: rows.map((o) => ({ ...o, statusLabel: orderStatusLabel(o.status, asBotLang(user.language)) })),
    };
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
