import { Promocode, PromocodeType } from '@prisma/client';

/** Kattalar va bolalar (2–13 yosh) o'lchamlari — dizayndagi "2–13 yosh va S–3XL" */
export const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
export const KID_SIZES = ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13'] as const;
export const ALL_SIZES: readonly string[] = [...ADULT_SIZES, ...KID_SIZES];

export interface KitPrices {
  shirtPrice: number;
  shortsPrice: number;
  printPrice: number;
}

export interface ItemOptions {
  withShorts: boolean;
  printName?: string | null;
  printNumber?: string | null;
}

export const hasPrint = (o: Pick<ItemOptions, 'printName' | 'printNumber'>) => Boolean(o.printName || o.printNumber);

/** Bitta to'plam narxi: futbolka + (shortik) + (ism/raqam bosmasi) */
export function unitPrice(kit: KitPrices, o: ItemOptions) {
  return kit.shirtPrice + (o.withShorts ? kit.shortsPrice : 0) + (hasPrint(o) ? kit.printPrice : 0);
}

/**
 * 3D dizayn (Superadmin yasagan forma) narxi — klub formasi narx jadvalidagi kalitlar bilan bir xil:
 * Superadmin "Narxlar" sahifasida o'zgartiriladi, mijoz yuborgan narx hech qachon ishlatilmaydi.
 */
export const KIT_DESIGN_PRICE_KEYS = { shirt: 'club.tshirt', shorts: 'club.shorts', print: 'club.print' } as const;
export const DEFAULT_KIT_DESIGN_PRICES: KitPrices = { shirtPrice: 99000, shortsPrice: 60000, printPrice: 30000 };

type PriceDb = { pricingItem: { findMany(args: { where: { key: { in: string[] } } }): Promise<{ key: string; price: number }[]> } };

/** Narx jadvalidan 3D dizayn narxlari (kalit bo'lmasa standart qiymat) */
export async function loadKitDesignPrices(db: PriceDb): Promise<KitPrices> {
  const rows = await db.pricingItem.findMany({ where: { key: { in: Object.values(KIT_DESIGN_PRICE_KEYS) } } });
  const byKey = new Map(rows.map((r) => [r.key, r.price]));
  return {
    shirtPrice: byKey.get(KIT_DESIGN_PRICE_KEYS.shirt) ?? DEFAULT_KIT_DESIGN_PRICES.shirtPrice,
    shortsPrice: byKey.get(KIT_DESIGN_PRICE_KEYS.shorts) ?? DEFAULT_KIT_DESIGN_PRICES.shortsPrice,
    printPrice: byKey.get(KIT_DESIGN_PRICE_KEYS.print) ?? DEFAULT_KIT_DESIGN_PRICES.printPrice,
  };
}

/** Katalogda ko'rsatiladigan "to'plam" narxi — futbolka + shortik + bosma (dizayndagi 189 000 so'm) */
export const fullSetPrice = (kit: KitPrices) => kit.shirtPrice + kit.shortsPrice + kit.printPrice;

/** 1000000 -> "1 000 000" (oddiy bo'shliq bilan — toLocaleString ko'rinmas U+202F qo'yadi) */
export const formatSum = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export type PromoCheck = Pick<
  Promocode,
  'code' | 'type' | 'value' | 'minSum' | 'usageCap' | 'usedCount' | 'startsAt' | 'endsAt' | 'isActive'
>;

/** Promokod ishlatib bo'lmasa sababini qaytaradi, aks holda null */
export function promoError(promo: PromoCheck | null, subtotal: number, now = new Date()): string | null {
  if (!promo || !promo.isActive) return 'Promokod topilmadi yoki faol emas';
  if (promo.startsAt && promo.startsAt > now) return 'Promokod hali boshlanmagan';
  if (promo.endsAt && promo.endsAt < now) return 'Promokod muddati tugagan';
  if (promo.usageCap != null && promo.usedCount >= promo.usageCap) return 'Promokod limiti tugagan';
  if (promo.minSum != null && subtotal < promo.minSum) {
    return `Promokod ${formatSum(promo.minSum)} so'mdan yuqori buyurtmalar uchun`;
  }
  return null;
}

export interface Summary {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
}

/** Savat yakuni: mahsulotlar − chegirma + yetkazish */
export function summarize(subtotal: number, deliveryFee: number, promo?: Pick<Promocode, 'type' | 'value'> | null): Summary {
  let discount = 0;
  let delivery = subtotal > 0 ? deliveryFee : 0;
  if (promo) {
    if (promo.type === PromocodeType.PERCENT) discount = Math.round((subtotal * Math.min(promo.value, 100)) / 100);
    else if (promo.type === PromocodeType.FIXED) discount = Math.min(promo.value, subtotal);
    else if (promo.type === PromocodeType.FREE_SHIPPING) delivery = 0;
  }
  return { subtotal, discount, delivery, total: subtotal - discount + delivery };
}
