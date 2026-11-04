import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditCategory,
  BalanceTxType,
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
import { InventoryService } from '../admin/inventory.service';
import { AddressesService, formatAddress } from './addresses.service';
import { CartService, lineProblem, toCartItem } from './cart.service';
import { CUSTOMER_STAGES, customerStageOf, STATUS_LABEL } from './order-status';
import { dayLabel, DeliveryService, todayLocal } from './delivery.service';
import { ChangePaymentMethodDto, CheckoutDto, MyOrdersQueryDto } from './dto/checkout.dto';
import { summarize } from './pricing';
import { RulesService } from './rules.service';
import { inTashkentCity } from './tashkent';
import { CUSTOM_TITLE, designSummary } from './studio';
import { KIT_DESIGN_TITLE } from '../kits/kit-design';
import { StudioService } from './studio.service';
import { WalletService } from '../wallet/wallet.service';

/** Click/Payme: buyurtma to'lov uchun shuncha vaqt band turadi */
export const PAYMENT_HOLD_MS = 30 * 60 * 1000;
/** Bir mijozning bir vaqtdagi to'lanmagan onlayn buyurtmalari (slot/promokod band qilib turish suiiste'molidan) */
export const MAX_UNPAID_ONLINE_ORDERS = 3;

const ONLINE: PaymentMethod[] = [PaymentMethod.CLICK, PaymentMethod.PAYME];
const FINAL: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED];
// Sex qabul qilgunga qadar mijoz o'zi bekor qila oladi
const CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING_PAYMENT, OrderStatus.NEW, OrderStatus.SENT_TO_WORKSHOP];

export { STATUS_LABEL };

const include = {
  items: { orderBy: { id: 'asc' }, include: { kit: { select: { bgColor: true, textColor: true } } } },
  promocode: { select: { code: true } },
  statusLogs: { orderBy: { id: 'asc' }, select: { toStatus: true, createdAt: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;

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

export const orderCode = (id: number) => `FRM-${String(id).padStart(6, '0')}`;

/**
 * Demo to'lov tasdig'i (Click/Payme integratsiyasigacha) — faqat dev/test muhitida.
 * Productionda HECH QACHON yoqilmaydi: aks holda har kim pulsiz buyurtmani "to'langan" qila oladi.
 */
export const demoPaymentEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.PAYMENT_DEMO !== 'false';

/**
 * Mijoz o'zi bekor qila oladimi: to'lanmagan buyurtma — har doim; qolganlari sex qabul qilguncha va
 * Superadmin sozlamasidagi muddat (`cancelWindowHours`, buyurtmadan keyin) ichida.
 * `windowHours` berilmasa — faqat holat bo'yicha.
 */
export function customerCanCancel(o: { status: OrderStatus; createdAt: Date }, windowHours?: number, now = Date.now()) {
  if (o.status === OrderStatus.PENDING_PAYMENT) return true;
  if (!CANCELLABLE.includes(o.status)) return false;
  return windowHours == null || now - o.createdAt.getTime() <= windowHours * 3_600_000;
}

export function toOrderView(o: OrderRow, cancelWindowHours?: number) {
  const date = o.deliveryDate?.toISOString().slice(0, 10) ?? null;
  const current = customerStageOf(o.status);
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
    private readonly wallet: WalletService,
    private readonly inventory: InventoryService,
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
  /** true — bekor qilindi; false — holat shu orada o'zgargan (masalan, sex qabul qildi) */
  private async release(id: number, paymentStatus: PaymentStatus, from: OrderStatus, actor: AuthUser | null, note?: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: from },
        data: { status: OrderStatus.CANCELLED, paymentStatus },
      });
      if (!count) return false;
      await this.history.record({ orderId: id, from, to: OrderStatus.CANCELLED, actor, note }, tx);
      // Balansdan to'langan bo'lsa — pul shu tranzaksiyada (bir marta) qaytadi
      await this.wallet.refundOrder(tx, id, actor?.id ?? null);
      const order = await tx.order.findUniqueOrThrow({
        where: { id },
        select: {
          promocodeId: true,
          items: { select: { kitId: true, shirtSize: true, shortsSize: true, withShorts: true, quantity: true } },
        },
      });
      // checkout paytida kamaytirilgan zaxira endi orqaga qaytadi
      await this.inventory.restore(tx, order.items);
      if (order.promocodeId) {
        await tx.promocode.updateMany({
          where: { id: order.promocodeId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
      return true;
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
    const fromBalance = dto.paymentMethod === PaymentMethod.BALANCE;
    // Naqd faqat Toshkent shahri ichiga; shahardan tashqariga — faqat shaxsiy hisobdan
    if (dto.paymentMethod === PaymentMethod.CASH && !inTashkentCity(address.latitude, address.longitude)) {
      throw new BadRequestException(
        "Naqd to'lov faqat Toshkent shahri ichida. Shahardan tashqariga yetkazishda shaxsiy hisobdan to'lang",
      );
    }

    const orderId = await retrySerializable(() => this.prisma.$transaction(
      async (tx) => {
        const lines = await this.cart.lines(user.id, tx);
        if (!lines.length) throw new BadRequestException("Savat bo'sh");
        // To'lanmagan onlayn buyurtmalar slot va promokodni band qiladi — bitta mijoz ko'p ocholmasin
        if (online) {
          const unpaid = await tx.order.count({ where: { customerId: user.id, status: OrderStatus.PENDING_PAYMENT } });
          if (unpaid >= MAX_UNPAID_ONLINE_ORDERS) {
            throw new HttpException("To'lanmagan buyurtmalaringiz ko'p — avval ularni to'lang yoki bekor qiling", HttpStatus.TOO_MANY_REQUESTS);
          }
        }
        const prices = await this.cart.prices(tx);
        const problems = lines
          .map((l) => [l, lineProblem(l)] as const)
          .filter(([, p]) => p)
          .map(([l, p]) => `${l.kit ? `${l.kit.club.name} · ${l.kit.label}` : (l.kitDesign?.name ?? CUSTOM_TITLE)}: ${p}`);
        if (problems.length) throw new BadRequestException(`Savatni yangilang — ${problems.join('; ')}`);

        // Narxlar faqat server jadvallaridan (mijoz yuborgan summa yo'q)
        const items = lines.map((l) => toCartItem(l, prices));
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

        // Zaxira (ombor) shartli kamaytiriladi — yetarli bo'lmasa shu yerda xato, butun tranzaksiya qaytadi
        await this.inventory.reserve(
          tx,
          items.map((i) => ({
            kitId: i.kitId,
            shirtSize: i.shirtSize,
            shortsSize: i.shortsSize,
            withShorts: i.withShorts,
            quantity: i.quantity,
            label: i.title,
          })),
        );

        const first = items[0];
        const order = await tx.order.create({
          data: {
            code: `TMP-${randomUUID()}`,
            customerId: user.id,
            customerName: customer.fullName,
            customerPhone: customer.phone,
            // Admin paneldagi ro'yxat uchun qisqa ma'lumot — birinchi mahsulotdan
            clubId: first.club?.id ?? null,
            kitLabel: first.kit?.label ?? (first.kitDesign ? KIT_DESIGN_TITLE : CUSTOM_TITLE),
            productType: first.kit
              ? OrderProductType.CLUB_KIT
              : first.kitDesign
                ? OrderProductType.KIT_DESIGN
                : OrderProductType.CUSTOM_DESIGN,
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
            // Naqd va balans — darhol operatorga tushadi; Click/Payme — to'lovdan keyin
            status: online ? OrderStatus.PENDING_PAYMENT : OrderStatus.NEW,
            paymentExpiresAt: online ? new Date(Date.now() + PAYMENT_HOLD_MS) : null,
            ...(fromBalance && { paymentStatus: PaymentStatus.PAID, paidAt: new Date() }),
            promocodeId: promo?.id,
            deliveryDate: new Date(`${dto.deliveryDate}T00:00:00Z`),
            deliverySlot: dto.deliverySlot,
            deliveryAddress: formatAddress(address),
            comment: dto.comment || null,
            items: {
              create: items.map((i) => ({
                kitId: i.kitId,
                clubName: i.club?.name ?? i.kitDesign?.name ?? CUSTOM_TITLE,
                kitLabel: i.kit?.label ?? (i.kitDesign ? KIT_DESIGN_TITLE : i.design ? designSummary(i.design) : CUSTOM_TITLE),
                design: (i.design ?? undefined) as unknown as Prisma.InputJsonObject | undefined,
                // 3D dizayn: buyurtma paytidagi nusxa — keyin tahrirlansa/o'chirilsa ham sex aynan shuni tikadi
                kitDesignId: i.kitDesignId,
                designSnapshot: (i.kitDesign?.design ?? undefined) as unknown as Prisma.InputJsonObject | undefined,
                // Klub formasi: Forma 360° suratlari to'plami (admin/sex foto-360° ko'rsatadi)
                kit360Id: i.club?.kit360Id ?? null,
                printName: i.printName,
                printNumber: i.printNumber,
                numberOnShorts: i.numberOnShorts,
                shortsNumber: i.shortsNumber,
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
        // Balans yetmasa InsufficientBalanceError — butun buyurtma (slot, promokod, savat) qaytadi
        if (fromBalance && summary.total > 0) {
          await this.wallet.debit(tx, {
            userId: user.id,
            amount: summary.total,
            type: BalanceTxType.ORDER_PAYMENT,
            orderId: order.id,
            note: orderCode(order.id),
          });
        }
        await this.history.record({ orderId: order.id, from: null, to: order.status, actor: user }, tx);
        await tx.cartItem.deleteMany({ where: { userId: user.id } });
        return order.id;
      },
      // Slot sig'imi va promokod limiti parallel buyurtmalarda ham buzilmasin.
      // Standart maxWait 2s / timeout 5s — uzoq DB'da o'nlab so'rovli tranzaksiya P2028 bilan 500 berardi.
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 20_000 },
    ));

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include });
    await this.audit.log({
      actor: user,
      action: 'Buyurtma berildi',
      category: AuditCategory.ORDER,
      context: order.code,
    });
    // Naqd buyurtma darhol operatorga tushadi; onlayn to'lovlar to'lovdan keyin (confirmPayment)
    if (order.status === OrderStatus.NEW) void this.announceNew(order.code, order.customerName, order.totalSum);
    return { ...toOrderView(order, await this.cancelWindow()), payment: this.paymentInfo(order) };
  }

  private async cancelWindow() {
    return (await this.rules.rules()).cancelWindowHours;
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
    const window = await this.cancelWindow();
    return { items: items.map((o) => toOrderView(o, window)), total, page, limit };
  }

  /** Bosh sahifadagi "FRM-000124 · Yetkazishga chiqdi · Kuzatish" kartasi */
  async active(userId: number) {
    await this.expireStale(userId);
    const order = await this.prisma.order.findFirst({
      where: { customerId: userId, status: { notIn: FINAL } },
      orderBy: { createdAt: 'desc' },
      include,
    });
    return { order: order ? toOrderView(order, await this.cancelWindow()) : null };
  }

  async get(userId: number, id: number) {
    await this.expireStale(userId);
    const order = await this.own(userId, id);
    return { ...toOrderView(order, await this.cancelWindow()), payment: this.paymentInfo(order) };
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

  /**
   * To'lov kutayotgan buyurtmani balansdan to'lash. Holat sharti + balans sharti bitta tranzaksiyada:
   * ikki marta bosilsa ham bir marta yechiladi (ORDER_PAYMENT har buyurtmaga bitta).
   */
  async payWithBalance(user: AuthUser, id: number) {
    await this.expireStale(user.id);
    const order = await this.own(user.id, id);
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new ConflictException("Buyurtma to'lov kutmayapti");

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: OrderStatus.PENDING_PAYMENT },
        data: {
          paymentMethod: PaymentMethod.BALANCE,
          status: OrderStatus.NEW,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          paymentExpiresAt: null,
        },
      });
      if (!count) throw new ConflictException("Buyurtma to'lov kutmayapti");
      if (order.totalSum > 0) {
        await this.wallet.debit(tx, { userId: user.id, amount: order.totalSum, type: BalanceTxType.ORDER_PAYMENT, orderId: id, note: order.code });
      }
      await this.history.record(
        { orderId: id, from: OrderStatus.PENDING_PAYMENT, to: OrderStatus.NEW, actor: user, note: "Balansdan to'landi" },
        tx,
      );
    });

    await this.audit.log({ actor: user, action: "Buyurtma balansdan to'landi", category: AuditCategory.PAYMENT, context: order.code });
    void this.announceNew(order.code, order.customerName, order.totalSum);
    return this.get(user.id, id);
  }

  /** "Boshqa usulni tanlash" */
  async changePaymentMethod(user: AuthUser, id: number, dto: ChangePaymentMethodDto) {
    // Balansga o'tish — faqat haqiqiy yechish bilan (aks holda to'lanmagan buyurtma operatorga tushib qolardi)
    if (dto.paymentMethod === PaymentMethod.BALANCE) return this.payWithBalance(user, id);
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
          // Onlayn usullar orasida almashtirish muddatni uzaytirmaydi — aks holda slot va promokodni
          // cheksiz band qilib turish mumkin edi (har 25 daqiqada CLICK↔PAYME)
          paymentExpiresAt: online ? (order.paymentExpiresAt ?? new Date(Date.now() + PAYMENT_HOLD_MS)) : null,
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
    const windowHours = await this.cancelWindow();
    if (!customerCanCancel(order, windowHours)) {
      throw new ConflictException(
        `Buyurtmani faqat berilgandan keyin ${windowHours} soat ichida bekor qilish mumkin — operatorga murojaat qiling`,
      );
    }
    // To'langan bo'lsa pul qaytariladi (operator qo'lda qaytaradi)
    const paymentStatus = order.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : order.paymentStatus;
    const cancelled = await this.release(id, paymentStatus, order.status, user, 'Mijoz bekor qildi');
    // Shu orada sex qabul qilgan bo'lsa — bekor qilinmaydi (tikish boshlangan)
    if (!cancelled) {
      throw new ConflictException('Buyurtma tikuv sexi tomonidan qabul qilingan — bekor qilish uchun operatorga murojaat qiling');
    }

    await this.audit.log({ actor: user, action: 'Buyurtma bekor qilindi', category: AuditCategory.ORDER, context: order.code });
    return this.get(user.id, id);
  }
}
