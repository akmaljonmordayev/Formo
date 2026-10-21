import { pricingApi, settingsApi } from '../../features/platform/platformApi';

/*
 * Superadmin sahifalari uchun umumiy narx/sozlama yordamchilari.
 * Haqiqiy narxlar: GET /admin/pricing (narx jadvali) va GET /admin/settings ('delivery.fee').
 * Mobil ilova klub formasi narxini har bir formaning o'zidan (shirtPrice/shortsPrice/printPrice) oladi —
 * shuning uchun yangi forma narxi jadvaldan to'ldiriladi va "Barcha formalarga qo'llash" mavjud.
 */

export const PRICE_KEYS = {
  shirt: 'club.tshirt',
  shorts: 'club.shorts',
  print: 'club.print',
  studio: 'studio.custom',
  studioGradient: 'studio.gradient',
  studioPatch: 'studio.patch',
  studioGift: 'studio.gift',
};

// Jadval bo'sh bo'lsa (yangi baza) — shu standart qatorlar bilan yaratish taklif qilinadi
export const DEFAULT_PRICING = [
  { key: PRICE_KEYS.shirt, section: 'Klub formasi', step: 1, label: 'Futbolka', sub: "Barcha o'lchamlar: 2-13 yosh va S-3XL", price: 99000 },
  { key: PRICE_KEYS.shorts, section: 'Klub formasi', step: 1, label: 'Shortik', sub: "Futbolkaga qo'shimcha", price: 60000 },
  { key: PRICE_KEYS.print, section: 'Klub formasi', step: 1, label: 'Ism + raqam', sub: 'DTF bosma, orqa tomonda', price: 30000 },
  { key: PRICE_KEYS.studio, section: 'Dizayn studiyasi', step: 2, label: "O'z dizayni", sub: 'Futbolka + ism va raqam', price: 129000 },
  { key: PRICE_KEYS.studioGradient, section: 'Dizayn studiyasi', step: 2, label: 'Gradient / maxsus rang', sub: "Bir rangga qo'shimcha", price: 30000 },
  { key: PRICE_KEYS.studioPatch, section: 'Dizayn studiyasi', step: 2, label: 'Yamoq', sub: 'Kapitan belgisi, bayroq va h.k.', price: 10000 },
  { key: PRICE_KEYS.studioGift, section: 'Dizayn studiyasi', step: 2, label: "Sovg'a qutisi", sub: 'Karton quti, lenta, tabriknoma', price: 15000 },
];

export const FALLBACK_PRICES = { shirt: 99000, shorts: 60000, print: 30000 };

/** Narx jadvali ro'yxatidan kalit bo'yicha narx (topilmasa fallback) */
export const priceOf = (items, key, fallback = 0) => {
  const v = Number(items?.find((i) => i.key === key)?.price);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/** Yangi klub formasi uchun standart narxlar — jadvaldan */
export async function loadKitPrices() {
  try {
    const items = await pricingApi.list();
    return {
      shirtPrice: priceOf(items, PRICE_KEYS.shirt, FALLBACK_PRICES.shirt),
      shortsPrice: priceOf(items, PRICE_KEYS.shorts, FALLBACK_PRICES.shorts),
      printPrice: priceOf(items, PRICE_KEYS.print, FALLBACK_PRICES.print),
    };
  } catch {
    return { shirtPrice: FALLBACK_PRICES.shirt, shortsPrice: FALLBACK_PRICES.shorts, printPrice: FALLBACK_PRICES.print };
  }
}

export const kitSetPrice = (k) => (Number(k.shirtPrice) || 0) + (Number(k.shortsPrice) || 0) + (Number(k.printPrice) || 0);

/* ---------- Sozlama kalitlari ---------- */
export const SETTING_KEYS = {
  deliveryFee: 'delivery.fee',
  deliverySlots: 'delivery.slots',
  orderRules: 'order.rules',
  bannedWords: 'order.bannedWords',
  general: 'admin.general',
  notifications: 'admin.notifications',
  studio: 'studio.config',
};

export const DEFAULT_ORDER_RULES = {
  acceptOrders: true, // false — ilovada buyurtma vaqtincha to'xtatiladi
  pausedMessage: '',
  minOrderSum: 0,
  maxItemsPerOrder: 20,
  maxQtyPerItem: 10,
  productionDaysMin: 2,
  productionDaysMax: 5,
  prepaymentPercent: 100,
  allowCash: true,
  autoCancelUnpaidHours: 24,
  cancelWindowHours: 2,
  returnDays: 3,
  printNameMaxLength: 12,
  printNumberMin: 0,
  printNumberMax: 99,
  allowKidsSizes: true,
  terms: '',
};

export const DEFAULT_GENERAL = {
  companyName: 'Formo',
  supportPhone: '',
  supportTelegram: '',
  supportEmail: '',
  workHoursFrom: '09:00',
  workHoursTo: '21:00',
  maintenance: false,
};

export const DEFAULT_NOTIFICATIONS = {
  newOrder: true,
  paymentFailed: true,
  lateOrder: true,
  lowStock: true,
  telegramChatId: '',
};

export async function loadSettings() {
  return settingsApi.all();
}

export const saveSetting = (key, value) => settingsApi.update(key, value);
