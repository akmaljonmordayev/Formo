import { OrderStatus } from '@prisma/client';

/**
 * Mijozga ko'rinadigan holat nomlari — mobil ilova va Telegram xabarlari bir xil matnni ishlatadi.
 * Mijoz ichki ishlab chiqarish bosqichlarini ko'rmaydi: 4 bosqich — yuborildi → qabul qilindi →
 * jarayonda → yetkazilmoqda (+ yakuniy holatlar).
 */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "To'lov kutilmoqda",
  NEW: 'Buyurtma yuborildi',
  SENT_TO_WORKSHOP: 'Buyurtma qabul qilindi',
  ACCEPTED: 'Buyurtma jarayonda',
  PRINTING: 'Buyurtma jarayonda',
  QUALITY_CHECK: 'Buyurtma jarayonda',
  READY: 'Buyurtma jarayonda',
  DELIVERING: 'Yetkazilmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
  RETURNED: 'Qaytarildi',
};

/** Mijoz timeline'i bosqichlari: har bosqich bir nechta ichki holatni o'z ichiga oladi */
export const CUSTOMER_STAGES: { status: OrderStatus; statuses: OrderStatus[] }[] = [
  { status: OrderStatus.NEW, statuses: [OrderStatus.NEW] },
  { status: OrderStatus.SENT_TO_WORKSHOP, statuses: [OrderStatus.SENT_TO_WORKSHOP] },
  {
    status: OrderStatus.ACCEPTED,
    statuses: [OrderStatus.ACCEPTED, OrderStatus.PRINTING, OrderStatus.QUALITY_CHECK, OrderStatus.READY],
  },
  { status: OrderStatus.DELIVERING, statuses: [OrderStatus.DELIVERING] },
  { status: OrderStatus.DELIVERED, statuses: [OrderStatus.DELIVERED] },
];

/** Holat → mijoz bosqichi indeksi; bosqichga kirmaydigan holat (to'lov kutish, bekor) — -1 */
export const customerStageOf = (status: OrderStatus) => CUSTOMER_STAGES.findIndex((s) => s.statuses.includes(status));

/**
 * Mijozga xabar berish kerakmi: bosqich oldinga siljisa yoki yakuniy/bosqichsiz holatga (bekor, qaytarildi)
 * o'tilsa. ACCEPTED → READY (ikkalasi "jarayonda") va sex rad etib NEW ga qaytishi — xabarsiz.
 */
export function customerStageChanged(from: OrderStatus | null, to: OrderStatus) {
  if (from === to) return false;
  const toIdx = customerStageOf(to);
  if (toIdx < 0) return true;
  return from == null || toIdx > customerStageOf(from);
}
