import { PromocodeType } from '@prisma/client';
import { addDays, dayLabel, todayLocal } from './delivery.service';
import {
  DEFAULT_KIT_DESIGN_PRICES,
  fullSetPrice,
  loadKitDesignPrices,
  priceForSize,
  promoError,
  PromoCheck,
  summarize,
  unitPrice,
} from './pricing';

const kit = { shirtPrice: 159000, printPrice: 30000 };

describe('narx hisoblash', () => {
  it("to'plam narxi dizayndagidek: 159 000 + 30 000 = 189 000", () => {
    expect(fullSetPrice(kit)).toBe(189000);
    expect(unitPrice(kit, { printName: 'AZIZ', printNumber: '10' })).toBe(189000);
  });

  it("ism/raqam bo'lmasa bosma narxi qo'shilmaydi", () => {
    expect(unitPrice(kit, {})).toBe(159000);
  });

  it("faqat raqam ham bosma hisoblanadi", () => {
    expect(unitPrice(kit, { printNumber: '7' })).toBe(189000);
  });
});

describe("o'lcham bo'yicha narx (sizePrices)", () => {
  const withSizePrices = { ...kit, sizePrices: { XXL: 170000, '3XL': 180000 } };

  it("sizePrices'da bor o'lcham — o'z narxi", () => {
    expect(priceForSize(withSizePrices, 'XXL')).toBe(170000);
    expect(priceForSize(withSizePrices, '3XL')).toBe(180000);
  });

  it("sizePrices'da yo'q o'lcham — shirtPrice (standart)", () => {
    expect(priceForSize(withSizePrices, 'S')).toBe(159000);
    expect(priceForSize(withSizePrices, undefined)).toBe(159000);
  });

  it("sizePrices umuman bo'lmasa (eski forma) — shirtPrice", () => {
    expect(priceForSize(kit, 'XXL')).toBe(159000);
  });

  it("0 yoki manfiy qiymat e'tiborga olinmaydi — shirtPrice qaytadi", () => {
    expect(priceForSize({ ...kit, sizePrices: { S: 0 } }, 'S')).toBe(159000);
  });

  it("unitPrice o'lchamga qarab hisoblaydi, bosma ustiga qo'shiladi", () => {
    expect(unitPrice(withSizePrices, { shirtSize: 'XXL' })).toBe(170000);
    expect(unitPrice(withSizePrices, { shirtSize: 'XXL', printNumber: '9' })).toBe(200000);
    expect(unitPrice(withSizePrices, { shirtSize: 'S' })).toBe(159000);
  });

  it('Prisma Json ustunidan kelgan qiymat (JsonValue) ham to‘g‘ri o‘qiladi', () => {
    // Prisma `Json` ustuni runtime'da oddiy obyekt/massiv/primitiv bo'lib keladi — tur xavfsizligi priceForSize ichida
    expect(priceForSize({ ...kit, sizePrices: null }, 'XXL')).toBe(159000);
    expect(priceForSize({ ...kit, sizePrices: [] as unknown }, 'XXL')).toBe(159000);
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

  it('PERCENT yaxlitlanadi: 333 dan 15% = 49.95 → 50; FREE_SHIPPING chegirma bermaydi', () => {
    expect(summarize(333, 0, { type: PromocodeType.PERCENT, value: 15 })).toMatchObject({ discount: 50, total: 283 });
    expect(summarize(189000, 15000, { type: PromocodeType.FREE_SHIPPING, value: 50 })).toMatchObject({ discount: 0 });
  });

  it("FIXED summadan kichik bo'lsa to'liq ayiriladi, yetkazish saqlanadi", () => {
    expect(summarize(189000, 15000, { type: PromocodeType.FIXED, value: 20000 })).toEqual({
      subtotal: 189000,
      discount: 20000,
      delivery: 15000,
      total: 184000,
    });
  });
});

describe('loadKitDesignPrices', () => {
  const db = (rows: { key: string; price: number }[]) => ({ pricingItem: { findMany: async () => rows } });

  it("jadvalda yo'q kalit — standart narx; bori — jadvaldagi narx", async () => {
    await expect(loadKitDesignPrices(db([]))).resolves.toEqual(DEFAULT_KIT_DESIGN_PRICES);
    await expect(loadKitDesignPrices(db([{ key: 'club.tshirt', price: 170000 }, { key: 'other', price: 1 }]))).resolves.toEqual({
      ...DEFAULT_KIT_DESIGN_PRICES,
      shirtPrice: 170000,
    });
  });

  it("eskirgan 'club.shorts' kaliti e'tiborga olinmaydi (shortik narxi komplektga qo'shilgan)", async () => {
    await expect(loadKitDesignPrices(db([{ key: 'club.shorts', price: 70000 }]))).resolves.toEqual(DEFAULT_KIT_DESIGN_PRICES);
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
  it("chegaralar: boshlanish/tugash aynan hozir, limitdan bitta kam — yaroqli", () => {
    expect(promoError({ ...base, startsAt: now, endsAt: now, usageCap: 5, usedCount: 4 }, 1, now)).toBeNull();
  });
  it('nofaol kod boshqa sabablardan oldin aytiladi', () => {
    expect(promoError({ ...base, isActive: false, endsAt: new Date('2026-10-01') }, 1, now)).toBe('Promokod topilmadi yoki faol emas');
  });
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
