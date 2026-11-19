import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';

/**
 * Kartadan to'lov: mijoz checkout'da "Kartadan to'lash"ni tanlaydi → buyurtma NEW, to'lov PENDING.
 * Admin "Kartadan to'lovchilar" sahifasida mijozga qo'ng'iroq qilib karta raqamini beradi, pul tushgach
 * "To'landi" qiladi va sexga yuboradi. Shu fayldagi qoidalar backend'ning barcha joylarida bir xil qo'llanadi.
 */

/** To'lanmagan karta buyurtmasi shuncha vaqtdan keyin avtomatik bekor bo'ladi (zaxira va promokod bo'shaydi) */
export const CARD_HOLD_MS = 24 * 60 * 60 * 1000;

/**
 * "Kartadan to'lovchilar" navbati: karta tanlagan, hali sexga yuborilmagan buyurtmalar (to'lov kutayotgan
 * yoki to'langan-u sex tanlanmagan, sex rad etib qaytargan). Navbatdagilar oddiy Buyurtmalar ro'yxati va
 * sonlarida ko'rinmaydi — ikki joyda ishlanmasin.
 */
export const CARD_QUEUE: Prisma.OrderWhereInput = { paymentMethod: PaymentMethod.CARD, status: OrderStatus.NEW };

/** Karta buyurtmasi, admin hali pul tushganini tasdiqlamagan (qo'ng'iroq kutmoqda) */
export const CARD_AWAITING: Prisma.OrderWhereInput = { ...CARD_QUEUE, paymentStatus: PaymentStatus.PENDING };

type PaymentInfo = { paymentMethod: PaymentMethod; paymentStatus: PaymentStatus };

/** Karta buyurtmasi to'lovi admin tomonidan hali tasdiqlanmagan */
export const cardUnpaid = (o: PaymentInfo) => o.paymentMethod === PaymentMethod.CARD && o.paymentStatus !== PaymentStatus.PAID;

/** Tushumga kiradigan holatlar (bekor qilingan, qaytarilgan va to'lov kutayotganlar kirmaydi) */
export const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.SENT_TO_WORKSHOP,
  OrderStatus.ACCEPTED,
  OrderStatus.PRINTING,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
];

/** Buyurtma tushumga kiradimi: kartaga pul hali tushmagan bo'lsa — yo'q (mijoz umuman to'lamasligi mumkin) */
export const isRevenue = (o: { status: OrderStatus } & PaymentInfo) => REVENUE_STATUSES.includes(o.status) && !cardUnpaid(o);

/** isRevenue'ning Prisma where ko'rinishi */
export const REVENUE_WHERE: Prisma.OrderWhereInput = {
  status: { in: REVENUE_STATUSES },
  NOT: { paymentMethod: PaymentMethod.CARD, paymentStatus: { not: PaymentStatus.PAID } },
};
