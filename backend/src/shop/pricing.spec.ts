import { PromocodeType } from '@prisma/client';
import { addDays, dayLabel, todayLocal } from './delivery.service';
import { fullSetPrice, promoError, PromoCheck, summarize, unitPrice } from './pricing';

const kit = { shirtPrice: 99000, shortsPrice: 60000, printPrice: 30000 };

describe('narx hisoblash', () => {
  it("to'plam narxi dizayndagidek: 99 000 + 60 000 + 30 000 = 189 000", () => {
    expect(fullSetPrice(kit)).toBe(189000);
    expect(unitPrice(kit, { withShorts: true, printName: 'AZIZ', printNumber: '10' })).toBe(189000);
  });

  it("ism/raqam bo'lmasa bosma narxi qo'shilmaydi", () => {
    expect(unitPrice(kit, { withShorts: true })).toBe(159000);
  });

  it("faqat raqam ham bosma hisoblanadi", () => {
    expect(unitPrice(kit, { withShorts: true, printNumber: '7' })).toBe(189000);
  });

  it('shortiksiz', () => {
    expect(unitPrice(kit, { withShorts: false, printName: 'AZIZ' })).toBe(129000);
  });
});

describe('summarize', () => {
  it('FORMO10: 408 000 dan 10% = 40 800, yetkazish 15 000', () => {
    expect(summarize(408000, 15000, { type: PromocodeType.PERCENT, value: 10 })).toEqual({
      subtotal: 408000,
      discount: 40800,
      delivery: 15000,
      total: 382200,
    });
  });

  it("FIXED chegirma summadan oshmaydi", () => {
    expect(summarize(50000, 15000, { type: PromocodeType.FIXED, value: 80000 })).toMatchObject({ discount: 50000, total: 15000 });
  });

  it('FREE_SHIPPING yetkazishni nolga tushiradi', () => {
    expect(summarize(189000, 15000, { type: PromocodeType.FREE_SHIPPING, value: 0 })).toMatchObject({ delivery: 0, total: 189000 });
  });

  it("bo'sh savatda yetkazish olinmaydi", () => {
    expect(summarize(0, 15000)).toEqual({ subtotal: 0, discount: 0, delivery: 0, total: 0 });
  });

  it("PERCENT 100 dan oshsa ham manfiy summa bo'lmaydi", () => {
    expect(summarize(1000, 0, { type: PromocodeType.PERCENT, value: 150 }).total).toBe(0);
  });
});

describe('promoError', () => {
  const now = new Date('2026-10-15T10:00:00Z');
  const base: PromoCheck = {
    code: 'FORMO10',
    type: PromocodeType.PERCENT,
    value: 10,
    minSum: null,
    usageCap: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    isActive: true,
  };

  it('yaroqli', () => expect(promoError(base, 100000, now)).toBeNull());
  it('topilmadi', () => expect(promoError(null, 100000, now)).toMatch(/topilmadi/));
  it('nofaol', () => expect(promoError({ ...base, isActive: false }, 100000, now)).toMatch(/faol emas/));
  it('boshlanmagan', () => expect(promoError({ ...base, startsAt: new Date('2026-11-01') }, 1, now)).toMatch(/boshlanmagan/));
  it('tugagan', () => expect(promoError({ ...base, endsAt: new Date('2026-10-01') }, 1, now)).toMatch(/tugagan/));
  it('limit', () => expect(promoError({ ...base, usageCap: 5, usedCount: 5 }, 1, now)).toMatch(/limiti/));
  it('minimal summa', () => {
    expect(promoError({ ...base, minSum: 200000 }, 199999, now)).toBe("Promokod 200 000 so'mdan yuqori buyurtmalar uchun");
    expect(promoError({ ...base, minSum: 200000 }, 200000, now)).toBeNull();
  });
});

describe('yetkazish sanalari', () => {
  it('Toshkent vaqti: UTC 20:00 da Toshkentda ertangi kun', () => {
    expect(todayLocal(new Date('2026-10-15T20:00:00Z'))).toBe('2026-10-16');
    expect(todayLocal(new Date('2026-10-15T18:59:00Z'))).toBe('2026-10-15');
  });

  it('addDays oy va yil chegarasidan o‘tadi', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 2)).toBe('2027-01-02');
  });

  it('dayLabel: ertaga, keyin hafta kuni', () => {
    // 2026-10-15 — payshanba
    expect(dayLabel('2026-10-16', '2026-10-15')).toBe('Ertaga');
    expect(dayLabel('2026-10-17', '2026-10-15')).toBe('Shanba');
    expect(dayLabel('2026-10-16', '2026-10-14')).toBe('Juma');
  });
});
