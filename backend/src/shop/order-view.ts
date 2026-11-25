import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { CUSTOMER_STAGES, customerStageOf, STATUS_LABEL } from './order-status';
import { dayLabel, todayLocal } from './delivery.service';
import { COURIER_DAYS, inTashkentCity, isPostalDelivery, POSTAL_DAYS } from './tashkent';

/** Mijoz buyurtmasi ko'rinishi va sof qoidalar (bekor qilish, naqd hududi, kod) — ShopOrdersService ishlatadi */

// Mijoz o'zi faqat admin buyurtmani qabul qilguncha bekor qila oladi: "Buyurtma qabul qilindi"
// (SENT_TO_WORKSHOP — operator sexga yuborgan) holatidan boshlab — faqat administratsiya orqali
export const CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING_PAYMENT, OrderStatus.NEW];

export const include = {
  items: { orderBy: { id: 'asc' }, include: { kit: { select: { bgColor: true, textColor: true } } } },
  promocode: { select: { code: true } },
  statusLogs: { orderBy: { id: 'asc' }, select: { toStatus: true, createdAt: true } },
} satisfies Prisma.OrderInclude;

export type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;

/**
 * Serializable tranzaksiya parallel so'rov bilan to'qnashsa (P2034) — butun tranzaksiya
 * qaytariladi, demak qayta urinish xavfsiz. Mijoz "qayta urinib ko'ring" ko'rmasin.
 */
export async function retrySerializable<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await run();
    } catch (e) {
      const conflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034';
      if (!conflict || i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 50 * i + Math.floor(Math.random() * 50)));
    }
  }
}

/**
 * Naqd faqat Toshkent shahri ichiga (kuryer); viloyatlarga (pochta) — faqat kartadan.
 * Viloyat ko'rsatilgan manzilda — viloyat bo'yicha, eski manzilda — xarita nuqtasi bo'yicha (isPostalDelivery).
 * Checkout'da ham, keyin "to'lov usulini o'zgartirish"da ham (Click → naqd) bir xil tekshiriladi.
 */
export function assertCashArea(a: { region?: string | null; latitude?: number | null; longitude?: number | null }) {
  const outside = !a.region ? !inTashkentCity(a.latitude, a.longitude) : isPostalDelivery(a);
  if (outside) {
    throw new BadRequestException("Naqd to'lov faqat Toshkent shahri ichida. Shahardan tashqariga yetkazishda karta orqali to'lang");
  }
}

export const orderCode = (id: number) => `FRM-${String(id).padStart(6, '0')}`;

/**
 * Demo to'lov tasdig'i (Click/Payme integratsiyasigacha) — faqat dev/test muhitida.
 * Productionda HECH QACHON yoqilmaydi: aks holda har kim pulsiz buyurtmani "to'langan" qila oladi.
 * Faqat aniq yoqilganda ishlaydi (PAYMENT_DEMO=true) — NODE_ENV qo'yilmagan staging deploy ham xavfsiz.
 */
export const demoPaymentEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.PAYMENT_DEMO?.trim().toLowerCase() === 'true';

/**
 * Mijoz o'zi bekor qila oladimi: to'lanmagan buyurtma — har doim; qolganlari admin qabul qilguncha (NEW) va
 * Superadmin sozlamasidagi muddat (`cancelWindowHours`, buyurtmadan keyin) ichida.
 * `windowHours` berilmasa — faqat holat bo'yicha.
 */
export function customerCanCancel(
  o: { status: OrderStatus; createdAt: Date; paymentMethod?: PaymentMethod; paymentStatus?: PaymentStatus },
  windowHours?: number,
  now = Date.now(),
) {
  if (o.status === OrderStatus.PENDING_PAYMENT) return true;
  if (!CANCELLABLE.includes(o.status)) return false;
  // Kartaga pul tushgan (admin "To'landi" qilgan) buyurtma — pul admin kartasida, uni qaytarish qo'lda:
  // faqat administratsiya orqali bekor qilinadi (aks holda "qaytarildi" deb yozilib, pul qaytmay qolardi)
  if (o.paymentMethod === PaymentMethod.CARD && o.paymentStatus === PaymentStatus.PAID) return false;
  return windowHours == null || now - o.createdAt.getTime() <= windowHours * 3_600_000;
}

export const canConfirmReceipt = (o: { status: OrderStatus; receivedAt: Date | null }) =>
  !o.receivedAt && (o.status === OrderStatus.DELIVERING || o.status === OrderStatus.DELIVERED);

export function toOrderView(o: OrderRow, cancelWindowHours?: number) {
  const date = o.deliveryDate?.toISOString().slice(0, 10) ?? null;
  const current = customerStageOf(o.status);
  // Mobil buyurtma sana/vaqtsiz — viloyatga pochta orqali (operator qo'lda kiritgan buyurtmada manzil ham yo'q)
  const postal =
    !date &&
    Boolean(o.deliveryAddress) &&
    isPostalDelivery({ region: o.deliveryRegion, latitude: o.deliveryLat, longitude: o.deliveryLng });
  // Toshkent shahri ichida kuryer: kun/vaqt tanlanmaydi (eski buyurtmalarda sana va vaqt bor — o'shanisi ko'rsatiladi)
  const courier = !date && Boolean(o.deliveryAddress) && !postal;
  // Tarix tartib bilan o'qiladi — keyingi yozuv oldingisini bosadi
  const reached = new Map(o.statusLogs.map((l) => [l.toStatus, l.createdAt]));
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status],
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paymentExpiresAt: o.status === OrderStatus.PENDING_PAYMENT ? o.paymentExpiresAt : null,
    summary: { subtotal: o.subtotalSum, discount: o.discountSum, delivery: o.deliverySum, total: o.totalSum },
    promocode: o.promocode?.code ?? null,
    delivery: {
      date,
      slot: o.deliverySlot,
      // Viloyatlarga — pochta bo'limigacha, Toshkent shahri ichida — kuryer uygacha (kun/vaqt tanlanmaydi);
      // eski buyurtmalarda: "ertaga, 10:00–14:00"
      label:
        date && o.deliverySlot
          ? `${dayLabel(date, todayLocal()).toLowerCase()}, ${o.deliverySlot}`
          : postal
            ? `pochta orqali, ${POSTAL_DAYS.min}–${POSTAL_DAYS.max} ish kuni`
            : courier
              ? `kuryer orqali, ${COURIER_DAYS.min}–${COURIER_DAYS.max} kun`
              : null,
      address: o.deliveryAddress,
      region: o.deliveryRegion,
      district: o.deliveryDistrict,
      latitude: o.deliveryLat,
      longitude: o.deliveryLng,
      postal,
      postalDays: postal ? POSTAL_DAYS : null,
      courierDays: courier ? COURIER_DAYS : null,
    },
    comment: o.comment,
    itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
    items: o.items.map(({ kit, orderId: _o, ...i }) => ({ ...i, bgColor: kit?.bgColor ?? null, textColor: kit?.textColor ?? null })),
    // Mijoz 4 bosqichni ko'radi (+ yetkazildi): ichki sex holatlari (bosish, sifat nazorati, tayyor) "jarayonda"
    timeline: CUSTOMER_STAGES.map(({ status, statuses }, i) => {
      // bosqichga oxirgi marta qachon kirilgan (sex rad etib qayta yuborilsa ham to'g'ri chiqadi) — bosqich
      // ichidagi holatlardan eng birinchisi
      const times = statuses.map((s) => reached.get(s)).filter((d): d is Date => Boolean(d));
      const at = times.length ? times.reduce((a, b) => (a < b ? a : b)) : null;
      return {
        status,
        label: STATUS_LABEL[status],
        done: current >= 0 && i <= current,
        current: i === current,
        at: current >= 0 && i <= current ? at : null,
      };
    }),
    canCancel: customerCanCancel(o, cancelWindowHours),
    // "Buyurtmani qabul qildim": yetkazilayotgan yoki admin "yetkazildi" degan, mijoz hali tasdiqlamagan buyurtma
    receivedAt: o.receivedAt,
    canConfirmReceipt: canConfirmReceipt(o),
    // Holat oxirgi marta qachon o'zgargan (sex ichidagi PRINTING → QUALITY_CHECK ham) — "Yangilandi" vaqti
    statusChangedAt: o.statusLogs.reduce<Date>((a, l) => (l.createdAt > a ? l.createdAt : a), o.createdAt),
    createdAt: o.createdAt,
  };
}
