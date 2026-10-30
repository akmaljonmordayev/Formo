import { OrderStatus } from '@prisma/client';

/** Mijozga ko'rinadigan holat nomlari — mobil ilova timeline'i va Telegram xabarlari bir xil matnni ishlatadi */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "To'lov kutilmoqda",
  NEW: 'Qabul qilindi',
  SENT_TO_WORKSHOP: 'Sexga yuborildi',
  ACCEPTED: 'Sex qabul qildi',
  PRINTING: 'Bosilmoqda',
  QUALITY_CHECK: 'Sifat nazorati',
  READY: 'Tayyor',
  DELIVERING: 'Yetkazishga chiqdi',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
  RETURNED: 'Qaytarildi',
};
