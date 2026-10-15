import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { SETTING_DEFAULTS } from '../admin/settings.service';
import { PrismaService } from '../prisma/prisma.service';

export const TIMEZONE = 'Asia/Tashkent';
/** Yetkazish ertadan boshlab shuncha kun ichida tanlanishi mumkin */
export const MAX_DELIVERY_DAYS = 7;

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
// Bekor qilingan/qaytarilgan buyurtmalar slot sig'imini band qilmaydi
const FREE_STATUSES: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.RETURNED];

interface SlotSetting {
  start: string;
  end: string;
  cap: number;
  on: boolean;
}

type Db = PrismaService | Prisma.TransactionClient;

/** Toshkent vaqti bo'yicha bugungi sana, "YYYY-MM-DD" */
export function todayLocal(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now);
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayLabel(date: string, today: string) {
  if (date === addDays(today, 1)) return 'Ertaga';
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

const slotKey = (s: Pick<SlotSetting, 'start' | 'end'>) => `${s.start}-${s.end}`;

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  private async setting<T>(key: string, db: Db = this.prisma): Promise<T> {
    const row = await db.setting.findUnique({ where: { key } });
    return (row?.value ?? SETTING_DEFAULTS[key]) as T;
  }

  async fee(db: Db = this.prisma) {
    const fee = Number(await this.setting<number>('delivery.fee', db));
    return Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : 0;
  }

  /** Sozlamalardagi yoqilgan slotlar (noto'g'ri shakldagi yozuvlar tashlab yuboriladi) */
  private async enabledSlots(db: Db = this.prisma): Promise<SlotSetting[]> {
    const raw = await this.setting<unknown>('delivery.slots', db);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (s): s is SlotSetting =>
        !!s &&
        typeof s.start === 'string' &&
        typeof s.end === 'string' &&
        typeof s.cap === 'number' &&
        s.on !== false,
    );
  }

  private async bookedCounts(dates: string[], db: Db = this.prisma) {
    const rows = await db.order.groupBy({
      by: ['deliveryDate', 'deliverySlot'],
      where: {
        deliveryDate: { in: dates.map((d) => new Date(`${d}T00:00:00Z`)) },
        status: { notIn: FREE_STATUSES },
      },
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.deliveryDate && r.deliverySlot) {
        map.set(`${r.deliveryDate.toISOString().slice(0, 10)}|${r.deliverySlot}`, r._count._all);
      }
    }
    return map;
  }

  /** Rasmiylashtirish ekranidagi "Yetkazish vaqti" — ertadan boshlab `days` kun */
  async slots(days = 3) {
    const today = todayLocal();
    const dates = Array.from({ length: Math.min(Math.max(days, 1), MAX_DELIVERY_DAYS) }, (_, i) => addDays(today, i + 1));
    const [slots, booked] = await Promise.all([this.enabledSlots(), this.bookedCounts(dates)]);

    return dates.map((date) => ({
      date,
      dayLabel: dayLabel(date, today),
      slots: slots.map((s) => {
        const remaining = Math.max(s.cap - (booked.get(`${date}|${slotKey(s)}`) ?? 0), 0);
        return { slot: slotKey(s), start: s.start, end: s.end, remaining, available: remaining > 0 };
      }),
    }));
  }

  /** Tanlangan sana/slot hali bo'shligini tekshiradi (buyurtma tranzaksiyasi ichida) */
  async assertAvailable(date: string, slot: string, db: Db = this.prisma) {
    const today = todayLocal();
    if (date <= today || date > addDays(today, MAX_DELIVERY_DAYS)) {
      throw new BadRequestException(`Yetkazish sanasi ertadan boshlab ${MAX_DELIVERY_DAYS} kun ichida bo'lishi kerak`);
    }
    const setting = (await this.enabledSlots(db)).find((s) => slotKey(s) === slot);
    if (!setting) throw new BadRequestException('Bunday yetkazish vaqti mavjud emas');

    const booked = (await this.bookedCounts([date], db)).get(`${date}|${slot}`) ?? 0;
    if (booked >= setting.cap) throw new ConflictException("Bu vaqt band — boshqa vaqtni tanlang");
  }
}
