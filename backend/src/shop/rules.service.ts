import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KID_SIZES } from './pricing';

type Db = PrismaService | Prisma.TransactionClient;

/** Superadmin "Sozlamalar → Buyurtma qoidalari" (`order.rules`); qiymat saqlanmagan bo'lsa shu default'lar */
export const DEFAULT_ORDER_RULES = {
  acceptOrders: true,
  pausedMessage: '',
  minOrderSum: 0,
  maxItemsPerOrder: 20,
  maxQtyPerItem: 10,
  productionDaysMin: 2,
  productionDaysMax: 5,
  allowCash: true,
  printNameMaxLength: 12,
  printNumberMin: 0,
  printNumberMax: 99,
  allowKidsSizes: true,
  cancelWindowHours: 2,
  returnDays: 3,
  terms: '',
};
export type OrderRules = typeof DEFAULT_ORDER_RULES;

/** Superadmin "Umumiy" (`admin.general`): texnik tanaffus, aloqa va ish vaqti */
export const DEFAULT_GENERAL = {
  companyName: 'Formo',
  supportPhone: '',
  supportTelegram: '',
  supportEmail: '',
  workHoursFrom: '09:00',
  workHoursTo: '21:00',
  maintenance: false,
};
export type GeneralSettings = typeof DEFAULT_GENERAL;

export interface LineInput {
  printName?: string | null;
  printNumber?: string | null;
  shortsNumber?: string | null;
  shirtSize?: string;
  shortsSize?: string | null;
  quantity?: number;
}

/**
 * Superadmin sozlamalarini mobil ilova buyurtmasiga qo'llaydi: savatga qo'shishda mahsulot cheklovlari,
 * rasmiylashtirishda esa buyurtma qabul qilish holati, minimal summa va to'lov usuli.
 */
@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async read<T extends object>(key: string, defaults: T, db: Db): Promise<T> {
    const row = await db.setting.findUnique({ where: { key } });
    const value = row?.value;
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...defaults, ...(value as object) } : defaults;
  }

  rules(db: Db = this.prisma) {
    return this.read('order.rules', DEFAULT_ORDER_RULES, db);
  }

  general(db: Db = this.prisma) {
    return this.read('admin.general', DEFAULT_GENERAL, db);
  }

  async bannedWords(db: Db = this.prisma): Promise<string[]> {
    const row = await db.setting.findUnique({ where: { key: 'order.bannedWords' } });
    return Array.isArray(row?.value) ? (row.value as unknown[]).map((w) => String(w).trim().toLowerCase()).filter(Boolean) : [];
  }

  /** Ilovadagi umumiy ma'lumot: taqiqlangan so'zlar ro'yxati qaytarilmaydi (faqat server tekshiradi) */
  async publicConfig() {
    const [rules, general] = await Promise.all([this.rules(), this.general()]);
    return {
      general,
      rules: {
        acceptOrders: rules.acceptOrders && !general.maintenance,
        pausedMessage: rules.pausedMessage,
        minOrderSum: rules.minOrderSum,
        maxItemsPerOrder: rules.maxItemsPerOrder,
        maxQtyPerItem: rules.maxQtyPerItem,
        productionDaysMin: rules.productionDaysMin,
        productionDaysMax: rules.productionDaysMax,
        allowCash: rules.allowCash,
        printNameMaxLength: rules.printNameMaxLength,
        printNumberMin: rules.printNumberMin,
        printNumberMax: rules.printNumberMax,
        allowKidsSizes: rules.allowKidsSizes,
        cancelWindowHours: rules.cancelWindowHours,
        returnDays: rules.returnDays,
        terms: rules.terms,
      },
    };
  }

  /** Buyurtma vaqtincha to'xtatilgan yoki texnik tanaffus bo'lsa — 503 (sabab matni bilan) */
  async assertAccepting(db: Db = this.prisma) {
    const [rules, general] = await Promise.all([this.rules(db), this.general(db)]);
    if (general.maintenance) {
      throw new ServiceUnavailableException(rules.pausedMessage || 'Texnik ishlar olib borilmoqda — keyinroq urinib ko‘ring');
    }
    if (!rules.acceptOrders) {
      throw new ServiceUnavailableException(rules.pausedMessage || 'Buyurtma qabul qilish vaqtincha to‘xtatilgan');
    }
  }

  /** Savatdagi bitta qator: ism/raqam uzunligi va taqiqlangan so'zlar, o'lcham guruhi, dona soni */
  async assertLine(line: LineInput, db: Db = this.prisma) {
    const [rules, banned] = await Promise.all([this.rules(db), this.bannedWords(db)]);

    const name = line.printName?.trim();
    if (name) {
      if (name.length > rules.printNameMaxLength) {
        throw new BadRequestException(`Ism ${rules.printNameMaxLength} belgidan oshmasligi kerak`);
      }
      const lower = name.toLowerCase();
      if (banned.some((w) => lower.includes(w))) throw new BadRequestException('Bu ismni formaga bosib bo‘lmaydi');
    }
    for (const value of [line.printNumber, line.shortsNumber]) {
      if (!value) continue;
      const n = Number(value);
      if (!Number.isInteger(n) || n < rules.printNumberMin || n > rules.printNumberMax) {
        throw new BadRequestException(`Raqam ${rules.printNumberMin} dan ${rules.printNumberMax} gacha bo‘lishi kerak`);
      }
    }
    if (!rules.allowKidsSizes) {
      const kids: readonly string[] = KID_SIZES;
      if ((line.shirtSize && kids.includes(line.shirtSize)) || (line.shortsSize && kids.includes(line.shortsSize))) {
        throw new BadRequestException('Bolalar o‘lchamlari hozircha mavjud emas');
      }
    }
    if (line.quantity != null && line.quantity > rules.maxQtyPerItem) {
      throw new BadRequestException(`Bitta mahsulotdan ko‘pi bilan ${rules.maxQtyPerItem} ta buyurtma qilish mumkin`);
    }
  }

  /** Savatga yangi qator qo'shilishi mumkinmi (qatorlar soni) */
  async assertLineCount(count: number, db: Db = this.prisma) {
    const { maxItemsPerOrder } = await this.rules(db);
    if (count >= maxItemsPerOrder) {
      throw new BadRequestException(`Savatda ${maxItemsPerOrder} tadan ortiq mahsulot bo'lmaydi`);
    }
  }

  /** Rasmiylashtirish: minimal summa, jami dona soni va naqd to'lov ruxsati */
  async assertCheckout(input: { subtotal: number; totalQty: number; cash: boolean }, db: Db = this.prisma) {
    const rules = await this.rules(db);
    if (input.subtotal < rules.minOrderSum) {
      throw new BadRequestException(`Minimal buyurtma summasi ${rules.minOrderSum} so'm`);
    }
    if (input.totalQty > rules.maxItemsPerOrder) {
      throw new BadRequestException(`Bitta buyurtmada ${rules.maxItemsPerOrder} tadan ortiq forma bo'lmaydi`);
    }
    if (input.cash && !rules.allowCash) throw new BadRequestException('Naqd to‘lov hozircha o‘chirilgan');
  }
}
