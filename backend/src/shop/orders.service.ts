import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditCategory,
  OrderChannel,
  OrderProductType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../admin/audit.service';
import { OrderHistoryService } from '../admin/order-history.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { NotifyService } from '../notify/notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddressesService, formatAddress } from './addresses.service';
import { CartService, lineProblem, toCartItem } from './cart.service';
import { dayLabel, DeliveryService, todayLocal } from './delivery.service';
import { ChangePaymentMethodDto, CheckoutDto, MyOrdersQueryDto } from './dto/checkout.dto';
import { summarize } from './pricing';
import { RulesService } from './rules.service';
import { CUSTOM_TITLE, designSummary } from './studio';
import { StudioService } from './studio.service';

/** Click/Payme: buyurtma to'lov uchun shuncha vaqt band turadi */
export const PAYMENT_HOLD_MS = 30 * 60 * 1000;

const ONLINE: PaymentMethod[] = [PaymentMethod.CLICK, PaymentMethod.PAYME];
const FINAL: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED];
// Sex qabul qilgunga qadar mijoz o'zi bekor qila oladi
const CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING_PAYMENT, OrderStatus.NEW, OrderStatus.SENT_TO_WORKSHOP];

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

const TIMELINE: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.SENT_TO_WORKSHOP,
  OrderStatus.ACCEPTED,
  OrderStatus.PRINTING,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
];

const include = {
  items: { orderBy: { id: 'asc' }, include: { kit: { select: { bgColor: true, textColor: true } } } },
  promocode: { select: { code: true } },
  statusLogs: { orderBy: { id: 'asc' }, select: { toStatus: true, createdAt: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;

export const orderCode = (id: number) => `FRM-${String(id).padStart(6, '0')}`;

/** Demo to'lov tasdig'i (Click/Payme integratsiyasigacha) — productionda faqat PAYMENT_DEMO=true bilan */
export const demoPaymentEnabled = () =>
  process.env.PAYMENT_DEMO === 'true' || (process.env.NODE_ENV !== 'production' && process.env.PAYMENT_DEMO !== 'false');

export function toOrderView(o: OrderRow) {
  const date = o.deliveryDate?.toISOString().slice(0, 10) ?? null;
  const current = TIMELINE.indexOf(o.status);
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
      // "Taxminiy yetkazish: ertaga, 10:00–14:00"
      label: date && o.deliverySlot ? `${dayLabel(date, todayLocal()).toLowerCase()}, ${o.deliverySlot}` : null,
      address: o.deliveryAddress,
    },
    comment: o.comment,
    itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
    items: o.items.map(({ kit, orderId: _o, ...i }) => ({ ...i, bgColor: kit?.bgColor ?? null, textColor: kit?.textColor ?? null })),
    timeline: TIMELINE.map((status, i) => ({
      status,
      label: STATUS_LABEL[status],
      done: current >= 0 && i <= current,
      current: i === current,
      // shu bosqichga oxirgi marta qachon o'tilgan (sex rad etib qayta yuborilsa ham to'g'ri chiqadi)
      at: current >= 0 && i <= current ? (reached.get(status) ?? null) : null,
    })),
    canCancel: CANCELLABLE.includes(o.status),
    createdAt: o.createdAt,
  };
}

@Injectable()
export class ShopOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly delivery: DeliveryService,
    private readonly addresses: AddressesService,
    private readonly audit: AuditService,
    private readonly history: OrderHistoryService,
    private readonly rules: RulesService,
    private readonly notify: NotifyService,
    private readonly studio: StudioService,
  ) {}

  /** Muddati o'tgan to'lanmagan buyurtmalarni bekor qiladi (slot va promokod bo'shaydi) */
  async expireStale(customerId?: number) {
    const stale = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        paymentExpiresAt: { lt: new Date() },
        ...(customerId && { customerId }),
      },
      select: { id: true, code: true, promocodeId: true },
    });
    for (const o of stale) {
      await this.release(o.id, PaymentStatus.FAILED, OrderStatus.PENDING_PAYMENT, null, "To'lov muddati tugadi");
      void this.notify.notify('paymentFailed', `❌ To'lov kutilib bekor qilindi: ${o.code}`);
    }
  }

  /**
   * Buyurtmani bekor qiladi va ishlatilgan promokodni qaytaradi.
   * `from` — faqat shu holatdagi buyurtma o'zgaradi (parallel so'rovlardan himoya).
   */
  private async release(id: number, paymentStatus: PaymentStatus, from: OrderStatus, actor: AuthUser | null, note?: string) {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: from },
        data: { status: OrderStatus.CANCELLED, paymentStatus },
      });
      if (!count) return;
      await this.history.record({ orderId: id, from, to: OrderStatus.CANCELLED, actor, note }, tx);
      const order = await tx.order.findUniqueOrThrow({ where: { id }, select: { promocodeId: true } });
      if (order.promocodeId) {
        await tx.promocode.updateMany({
          where: { id: order.promocodeId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });
  }

  async checkout(user: AuthUser, dto: CheckoutDto) {
    await this.rules.assertAccepting();
    await this.expireStale();
    const [customer, address] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { fullName: true, phone: true } }),
      this.addresses.get(user.id, dto.addressId),
    ]);
    const online = ONLINE.includes(dto.paymentMethod);

    const orderId = await this.prisma.$transaction(
      async (tx) => {
        const lines = await this.cart.lines(user.id, tx);
        if (!lines.length) throw new BadRequestException("Savat bo'sh");
        const problems = lines
          .map((l) => [l, lineProblem(l)] as const)
          .filter(([, p]) => p)
          .map(([l, p]) => `${l.kit ? `${l.kit.club.name} · ${l.kit.label}` : CUSTOM_TITLE}: ${p}`);
        if (problems.length) throw new BadRequestException(`Savatni yangilang — ${problems.join('; ')}`);

        const studioPrices = await this.studio.prices(tx);
        const items = lines.map((l) => toCartItem(l, studioPrices));
        const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
        await this.rules.assertCheckout(
          {
            subtotal,
            totalQty: items.reduce((s, i) => s + i.quantity, 0),
            cash: dto.paymentMethod === PaymentMethod.CASH,
          },
          tx,
        );
        const promo = dto.promocode ? await this.cart.resolvePromo(dto.promocode, subtotal, tx) : null;
        const summary = summarize(subtotal, await this.delivery.fee(tx), promo);
        await this.delivery.assertAvailable(dto.deliveryDate, dto.deliverySlot, tx);

        if (promo) {
          // Optimistik tekshiruv: boshqa buyurtma shu orada limitni olib qo'ymagan bo'lsin
          const { count } = await tx.promocode.updateMany({
            where: { id: promo.id, usedCount: promo.usedCount },
            data: { usedCount: { increment: 1 } },
          });
          if (!count) throw new ConflictException("Promokod hozirgina o'zgardi, qayta urinib ko'ring");
        }

        const first = items[0];
        const order = await tx.order.create({
          data: {
            code: `TMP-${randomUUID()}`,
            customerId: user.id,
            customerName: customer.fullName,
            customerPhone: customer.phone,
            // Admin paneldagi ro'yxat uchun qisqa ma'lumot — birinchi mahsulotdan
            clubId: first.club?.id ?? null,
            kitLabel: first.kit?.label ?? CUSTOM_TITLE,
            productType: first.kit ? OrderProductType.CLUB_KIT : OrderProductType.CUSTOM_DESIGN,
            printName: first.printName,
            printNumber: first.printNumber,
            size: first.shirtSize,
            quantity: items.reduce((s, i) => s + i.quantity, 0),
            subtotalSum: summary.subtotal,
            discountSum: summary.discount,
            deliverySum: summary.delivery,
            totalSum: summary.total,
            channel: OrderChannel.APP,
            paymentMethod: dto.paymentMethod,
            // Naqd — darhol operatorga tushadi; Click/Payme — to'lovdan keyin
            status: online ? OrderStatus.PENDING_PAYMENT : OrderStatus.NEW,
            paymentExpiresAt: online ? new Date(Date.now() + PAYMENT_HOLD_MS) : null,
            promocodeId: promo?.id,
            deliveryDate: new Date(`${dto.deliveryDate}T00:00:00Z`),
            deliverySlot: dto.deliverySlot,
            deliveryAddress: formatAddress(address),
            comment: dto.comment || null,
            items: {
              create: items.map((i) => ({
                kitId: i.kitId,
                clubName: i.club?.name ?? CUSTOM_TITLE,
                kitLabel: i.kit?.label ?? (i.design ? designSummary(i.design) : CUSTOM_TITLE),
                design: (i.design ?? undefined) as unknown as Prisma.InputJsonObject | undefined,
                printName: i.printName,
                printNumber: i.printNumber,
                numberOnShorts: i.numberOnShorts,
                withShorts: i.withShorts,
                shirtSize: i.shirtSize,
                shortsSize: i.shortsSize,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: i.totalPrice,
              })),
            },
          },
        });
        await tx.order.update({ where: { id: order.id }, data: { code: orderCode(order.id) } });
        await this.history.record({ orderId: order.id, from: null, to: order.status, actor: user }, tx);
        await tx.cartItem.deleteMany({ where: { userId: user.id } });
        return order.id;
      },
      // Slot sig'imi va promokod limiti parallel buyurtmalarda ham buzilmasin
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include });
    await this.audit.log({
      actor: user,
      action: 'Buyurtma berildi',
      category: AuditCategory.ORDER,
      context: order.code,
    });
    // Naqd buyurtma darhol operatorga tushadi; onlayn to'lovlar to'lovdan keyin (confirmPayment)
    if (order.status === OrderStatus.NEW) void this.announceNew(order.code, order.customerName, order.totalSum);
    return { ...toOrderView(order), payment: this.paymentInfo(order) };
  }

  private paymentInfo(o: OrderRow) {
    const pending = o.status === OrderStatus.PENDING_PAYMENT;
    return {
      method: o.paymentMethod,
      amount: o.totalSum,
      status: o.paymentStatus,
      required: pending,
      expiresAt: pending ? o.paymentExpiresAt : null,
      demo: pending && demoPaymentEnabled(),
    };
  }

  private async own(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({ where: { id, customerId: userId }, include });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return order;
  }

  async list(userId: number, query: MyOrdersQueryDto) {
    await this.expireStale(userId);
    const { status, page = 1, limit = 20 } = query;
    const where: Prisma.OrderWhereInput = { customerId: userId, ...(status && { status }) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.order.count({ where }),
    ]);
    return { items: items.map(toOrderView), total, page, limit };
  }

  /** Bosh sahifadagi "FRM-000124 · Yetkazishga chiqdi · Kuzatish" kartasi */
  async active(userId: number) {
    await this.expireStale(userId);
    const order = await this.prisma.order.findFirst({
      where: { customerId: userId, status: { notIn: FINAL } },
      orderBy: { createdAt: 'desc' },
      include,
    });
    return { order: order ? toOrderView(order) : null };
  }

  async get(userId: number, id: number) {
    await this.expireStale(userId);
    const order = await this.own(userId, id);
    return { ...toOrderView(order), payment: this.paymentInfo(order) };
  }

  /** "To'lovni tasdiqlash (demo)" — haqiqiy Click/Payme callback'i ulanguncha */
  async confirmPayment(user: AuthUser, id: number) {
    if (!demoPaymentEnabled()) throw new ForbiddenException("Demo to'lov o'chirilgan");
    await this.expireStale(user.id);
    const order = await this.own(user.id, id);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new ConflictException(
        order.status === OrderStatus.CANCELLED ? "To'lov muddati tugagan, buyurtma bekor qilindi" : "Buyurtma to'lov kutmayapti",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: OrderStatus.PENDING_PAYMENT },
        data: { status: OrderStatus.NEW, paymentStatus: PaymentStatus.PAID, paidAt: new Date(), paymentExpiresAt: null },
      });
      if (!count) throw new ConflictException("Buyurtma to'lov kutmayapti");
      await this.history.record(
        { orderId: id, from: OrderStatus.PENDING_PAYMENT, to: OrderStatus.NEW, actor: user, note: "To'lov qabul qilindi" },
        tx,
      );
    });

    await this.audit.log({ actor: user, action: "To'lov qabul qilindi", category: AuditCategory.PAYMENT, context: order.code });
    void this.announceNew(order.code, order.customerName, order.totalSum);
    return this.get(user.id, id);
  }

  private announceNew(code: string, customer: string, total: number) {
    return this.notify.notify('newOrder', `🆕 Yangi buyurtma ${code} · ${customer} · ${total.toLocaleString('ru-RU')} so'm`);
  }

  /** "Boshqa usulni tanlash" */
  async changePaymentMethod(user: AuthUser, id: number, dto: ChangePaymentMethodDto) {
    await this.expireStale(user.id);
    const order = await this.own(user.id, id);
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new ConflictException("To'lov usulini endi o'zgartirib bo'lmaydi");

    const online = ONLINE.includes(dto.paymentMethod);
    if (!online) await this.rules.assertCheckout({ subtotal: Number.MAX_SAFE_INTEGER, totalQty: 0, cash: true });
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: OrderStatus.PENDING_PAYMENT },
        data: {
          paymentMethod: dto.paymentMethod,
          // Naqd — kuryerga to'lanadi, buyurtma darhol operatorga tushadi
          status: online ? OrderStatus.PENDING_PAYMENT : OrderStatus.NEW,
          paymentExpiresAt: online ? new Date(Date.now() + PAYMENT_HOLD_MS) : null,
        },
      });
      if (count && !online) {
        await this.history.record({ orderId: id, from: OrderStatus.PENDING_PAYMENT, to: OrderStatus.NEW, actor: user }, tx);
      }
    });
    return this.get(user.id, id);
  }

  async cancel(user: AuthUser, id: number) {
    await this.expireStale(user.id);
    const order = await this.own(user.id, id);
    if (!CANCELLABLE.includes(order.status)) {
      throw new ConflictException('Buyurtma tikuv sexi tomonidan qabul qilingan — bekor qilish uchun operatorga murojaat qiling');
    }
    // To'langan bo'lsa pul qaytariladi (operator qo'lda qaytaradi)
    const paymentStatus = order.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : order.paymentStatus;
    await this.release(id, paymentStatus, order.status, user, 'Mijoz bekor qildi');

    await this.audit.log({ actor: user, action: 'Buyurtma bekor qilindi', category: AuditCategory.ORDER, context: order.code });
    return this.get(user.id, id);
  }
}
