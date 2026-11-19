import { BadRequestException } from '@nestjs/common';

/** Dashboard/hisobot davrlari — Toshkent kunlari bo'yicha (orders.service va workshop-orders.service ishlatadi) */
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 3660;

export interface RangeInput {
  days?: number;
  from?: string;
  to?: string;
  all?: boolean;
}

/** Toshkent vaqti UTC+5, yozgi vaqt yo'q — kun chegarasi doimiy siljish bilan hisoblanadi */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
/** Sana qaysi Toshkent kuniga tegishli: "2026-11-12" */
export const tashkentDayKey = (d: Date) => new Date(d.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
/** Toshkent kunining boshlanishi (00:00 Toshkent = oldingi kun 19:00 UTC) */
const dayStart = (key: string) => new Date(Date.parse(`${key}T00:00:00.000Z`) - TASHKENT_OFFSET_MS);

/**
 * Dashboard davri. `all` — birinchi buyurtma kunidan bugungacha (buyurtma yo'q bo'lsa — bugun);
 * from/to — shu oraliq; aks holda oxirgi `days` kun. Har doim butun Toshkent kunlari: `from` birinchi kun
 * 00:00 dan, shuning uchun kartochkalar (ordersCount, revenue) grafikdagi kunlar yig'indisiga teng.
 */
export function resolveRange(range: RangeInput, firstOrderAt?: Date | null) {
  if (range.all) {
    const today = tashkentDayKey(new Date());
    const from = dayStart(firstOrderAt ? tashkentDayKey(firstOrderAt) : today);
    const count = Math.round((dayStart(today).getTime() - from.getTime()) / DAY_MS) + 1;
    return { from, to: new Date(dayStart(today).getTime() + DAY_MS - 1), dayKeys: dayKeysFrom(from, count) };
  }
  if (range.from || range.to) {
    if (!range.from || !range.to) throw new BadRequestException("from va to birga yuborilishi kerak");
    const from = dayStart(range.from);
    const toStart = dayStart(range.to);
    // 2026-02-31 kabi sanalar JS'da jimgina 03-03 ga o'tib ketadi — qaytib solishtirib ushlaymiz
    const valid = (d: Date, s: string) => !Number.isNaN(d.getTime()) && tashkentDayKey(d) === s;
    if (!valid(from, range.from) || !valid(toStart, range.to)) throw new BadRequestException("Sana noto'g'ri");
    const count = Math.round((toStart.getTime() - from.getTime()) / DAY_MS) + 1;
    if (count < 1) throw new BadRequestException("from sanasi to dan keyin bo'lmasligi kerak");
    if (count > MAX_RANGE_DAYS) throw new BadRequestException(`Davr ${MAX_RANGE_DAYS} kundan oshmasligi kerak`);
    return { from, to: new Date(toStart.getTime() + DAY_MS - 1), dayKeys: dayKeysFrom(from, count) };
  }
  const days = range.days ?? 30;
  const from = new Date(dayStart(tashkentDayKey(new Date())).getTime() - (days - 1) * DAY_MS);
  return { from, to: undefined as Date | undefined, dayKeys: dayKeysFrom(from, days) };
}

const dayKeysFrom = (start: Date, count: number) =>
  Array.from({ length: count }, (_, i) => tashkentDayKey(new Date(start.getTime() + i * DAY_MS)));
