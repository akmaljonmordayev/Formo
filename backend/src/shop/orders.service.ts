import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
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
import { CartService, lineProblem, sizeTotals, toCartItem } from './cart.service';
import { STATUS_LABEL } from './order-status';
import { DeliveryService } from './delivery.service';
import { ChangePaymentMethodDto, CheckoutDto, MyOrdersQueryDto } from './dto/checkout.dto';
import { summarize } from './pricing';
import { RulesService } from './rules.service';
import { isPostalDelivery } from './tashkent';
import { CUSTOM_TITLE, designSummary } from './studio';
import { KIT_DESIGN_TITLE } from '../kits/kit-design';
import { StudioService } from './studio.service';
import { WalletService } from '../wallet/wallet.service';
import {
  assertCashArea,
  CANCELLABLE,
  canConfirmReceipt,
  customerCanCancel,
  demoPaymentEnabled,
  include,
  OrderRow,
  orderCode,
  retrySerializable,
  toOrderView,
} from './order-view';
import { CARD_AWAITING, CARD_HOLD_MS } from '../admin/card-payments';

/** Click/Payme: buyurtma to'lov uchun shuncha vaqt band turadi */
export const PAYMENT_HOLD_MS = 30 * 60 * 1000;
/** Bir mijozning bir vaqtdagi to'lanmagan buyurtmalari — Click/Payme va karta birga (zaxira/slot/promokod band qilib turish suiiste'molidan) */
export const MAX_UNPAID_ONLINE_ORDERS = 3;
/** Muddati o'tgan to'lanmagan buyurtmalar shu oraliqda fonda ham tozalanadi (mijoz ilovani ochmasa ham) */
const EXPIRE_SWEEP_MS = 10 * 60 * 1000;

const FINAL: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED];
export { STATUS_LABEL };
export {
  assertCashArea,
  canConfirmReceipt,
  customerCanCancel,
  demoPaymentEnabled,
  orderCode,
  retrySerializable,
  toOrderView,
} from './order-view';

/** Unpaid buyurtmalar soni: Click/Payme to'lov kutayotganlar + admin hali tasdiqlamagan karta buyurtmalari */
const unpaidOf = (customerId: number): Prisma.OrderWhereInput => ({
  customerId,
  OR: [{ status: OrderStatus.PENDING_PAYMENT }, CARD_AWAITING],
});

@Injectable()
export class ShopOrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShopOrdersService.name);
  private timer?: NodeJS.Timeout;

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

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      this.expireStale().catch((e: unknown) => this.logger.warn(`Muddati o'tgan buyurtmalar tozalanmadi: ${String(e)}`));
    }, EXPIRE_SWEEP_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Muddati o'tgan to'lanmagan buyurtmalarni bekor qiladi (zaxira, slot va promokod bo'shaydi):
   * Click/Payme — 30 daqiqa; karta — admin 24 soat ichida "To'landi" qilmasa.
   */
  async expireStale(customerId?: number) {
    const now = Date.now();
    const [stale, staleCard] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING_PAYMENT,
          paymentExpiresAt: { lt: new Date(now) },
          ...(customerId && { customerId }),
        },
        select: { id: true, code: true },
      }),
      this.prisma.order.findMany({
        where: { ...CARD_AWAITING, createdAt: { lt: new Date(now - CARD_HOLD_MS) }, ...(customerId && { customerId }) },
        select: { id: true, code: true },
      }),
    ]);
    for (const o of stale) {
      await this.release(o.id, PaymentStatus.FAILED, OrderStatus.PENDING_PAYMENT, null, "To'lov muddati tugadi");
      void this.notify.notify('paymentFailed', `❌ To'lov kutilib bekor qilindi: ${o.code}`);
    }
    for (const o of staleCard) {
      // Faqat hali to'lanmagan bo'lsa: shu orada admin "To'landi" qilgan bo'lsa — tegilmaydi
      const done = await this.release(o.id, PaymentStatus.FAILED, OrderStatus.NEW, null, "Kartadan to'lov 24 soatda kelmadi", {
        paymentStatus: PaymentStatus.PENDING,
      });
      if (done) void this.notify.notify('paymentFailed', `❌ Kartadan to'lov 24 soatda kelmadi, bekor qilindi: ${o.code}`);
    }
  }

  /**
   * Buyurtmani bekor qiladi va ishlatilgan promokodni qaytaradi.
   * `from` — faqat shu holatdagi buyurtma o'zgaradi (parallel so'rovlardan himoya).
   */
  /** true — bekor qilindi; false — holat shu orada o'zgargan (masalan, sex qabul qildi) */
  private async release(
    id: number,
    paymentStatus: PaymentStatus,
    from: OrderStatus,
    actor: AuthUser | null,
    note?: string,
    // qo'shimcha shart (masalan karta: hali to'lanmagan) — parallel o'zgarishdan himoya
    guard?: Prisma.OrderWhereInput,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: from, ...guard },
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
    if (dto.paymentMethod !== PaymentMethod.CARD && dto.paymentMethod !== PaymentMethod.CASH) {
      throw new BadRequestException('To‘lov usuli karta yoki naqd bo‘lishi kerak');
    }
    await this.rules.assertAccepting();
    await this.expireStale();
    const [customer, address] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { fullName: true, phone: true } }),
      this.addresses.get(user.id, dto.addressId),
    ]);
    const card = dto.paymentMethod === PaymentMethod.CARD;
    if (dto.paymentMethod === PaymentMethod.CASH) assertCashArea(address);

    // Viloyatlarga — pochta bo'limigacha; Toshkent shahri ichida — kuryer uygacha 2–3 kunda. Kun/vaqt tanlanmaydi;
    // ilovaning eski versiyasi yuborsa (Toshkent shahri) — avvalgidek tekshirilib saqlanadi
    const postal = isPostalDelivery(address);
    const deliveryDate = postal ? null : (dto.deliveryDate ?? null);
    const deliverySlot = postal ? null : (dto.deliverySlot ?? null);
    if (Boolean(deliveryDate) !== Boolean(deliverySlot)) throw new BadRequestException('Yetkazish kuni va vaqti birga yuboriladi');

    const orderId = await retrySerializable(() => this.prisma.$transaction(
      async (tx) => {
        const lines = await this.cart.lines(user.id, tx);
        if (!lines.length) throw new BadRequestException("Savat bo'sh");
        // To'lanmagan onlayn va karta buyurtmalar zaxira, slot va promokodni band qiladi — bitta mijoz ko'p ocholmasin
        if (card) {
          const unpaid = await tx.order.count({ where: unpaidOf(user.id) });
          if (unpaid >= MAX_UNPAID_ONLINE_ORDERS) {
            throw new HttpException("To'lanmagan buyurtmalaringiz ko'p — avval ularni to'lang yoki bekor qiling", HttpStatus.TOO_MANY_REQUESTS);
          }
        }
        const prices = await this.cart.prices(tx);
        const totals = sizeTotals(lines);
        const problems = lines
          .map((l) => [l, lineProblem(l, totals)] as const)
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
        const summary = summarize(subtotal, await this.delivery.fee(address.region, tx), promo);
        if (deliveryDate && deliverySlot) await this.delivery.assertAvailable(deliveryDate, deliverySlot, tx);

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
            // Karta va naqd buyurtmalar admin navbatiga tushadi; karta pul tushgani tasdiqlanguncha PENDING qoladi.
            status: OrderStatus.NEW,
            paymentExpiresAt: null,
            promocodeId: promo?.id,
            deliveryDate: deliveryDate ? new Date(`${deliveryDate}T00:00:00Z`) : null,
            deliverySlot,
            deliveryAddress: formatAddress(address),
            deliveryRegion: address.region ?? null,
            deliveryDistrict: address.district ?? null,
            // Xaritadagi aniq nuqta — admin panelda "Xaritada ochish"
            deliveryLat: address.latitude ?? null,
            deliveryLng: address.longitude ?? null,
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
                // Forma turi (kalta/uzun yeng, shortik/shalvar) — sex va admin aynan shu suratlarni ko'radi
                ...(i.kit && { sleeve: i.kit.sleeve, bottom: i.kit.bottom }),
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
    // Naqd/karta buyurtma darhol adminga tushadi; onlayn to'lovlar to'lovdan keyin (confirmPayment)
    if (order.paymentMethod === PaymentMethod.CARD) void this.announceCard(order.code, order.customerName, order.customerPhone, order.totalSum);
    else if (order.status === OrderStatus.NEW) void this.announceNew(order.code, order.customerName, order.totalSum);
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

  /** Kartadan to'lov so'rovi: admin mijozga qo'ng'iroq qilib karta raqamini beradi */
  private announceCard(code: string, customer: string, phone: string, total: number) {
    return this.notify.notify(
      'newOrder',
      `💳 Kartadan to'lov so'rovi ${code} · ${customer} · ${phone} · ${total.toLocaleString('ru-RU')} so'm — mijozga qo'ng'iroq qiling`,
    );
  }

  /**
   * To'lov kutayotgan buyurtmani balansdan to'lash. Holat sharti + balans sharti bitta tranzaksiyada:
   * ikki marta bosilsa ham bir marta yechiladi (ORDER_PAYMENT har buyurtmaga bitta).
   */
  async payWithBalance(user: AuthUser, id: number) {
    await this.expireStale(user.id);
    const order = await this.own(user.id, id);
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new ConflictException("Buyurtma to'lov kutmayapti");
    if (order.paymentMethod !== PaymentMethod.BALANCE) {
      throw new BadRequestException('Yangi buyurtmalar faqat karta yoki naqd orqali to‘lanadi');
    }

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
    if (dto.paymentMethod !== PaymentMethod.CARD && dto.paymentMethod !== PaymentMethod.CASH) {
      throw new BadRequestException('To‘lov usuli karta yoki naqd bo‘lishi kerak');
    }
    await this.expireStale(user.id);
    const order = await this.own(user.id, id);
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new ConflictException("To'lov usulini endi o'zgartirib bo'lmaydi");

    const card = dto.paymentMethod === PaymentMethod.CARD;
    const cash = dto.paymentMethod === PaymentMethod.CASH;
    // Karta — istalgan hududga (admin qo'ng'iroq qiladi); naqd — faqat Toshkent shahri ichida
    if (cash) {
      await this.rules.assertCheckout({ subtotal: Number.MAX_SAFE_INTEGER, totalQty: 0, cash: true });
      // Click/Payme bilan berilgan viloyat (pochta) buyurtmasi naqdga o'tib, to'lovsiz operatorga tushmasin
      assertCashArea({ region: order.deliveryRegion, latitude: order.deliveryLat, longitude: order.deliveryLng });
    }
    const changed = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: OrderStatus.PENDING_PAYMENT },
        data: {
          paymentMethod: dto.paymentMethod,
          // Naqd va karta buyurtmalari adminga tushadi; karta puli kelgach admin to'lovni belgilaydi.
          status: OrderStatus.NEW,
          paymentExpiresAt: null,
        },
      });
      if (count) {
        await this.history.record({ orderId: id, from: OrderStatus.PENDING_PAYMENT, to: OrderStatus.NEW, actor: user }, tx);
      }
      return count;
    });
    if (changed && card) void this.announceCard(order.code, order.customerName, order.customerPhone, order.totalSum);
    return this.get(user.id, id);
  }

  /**
   * Mijoz "Buyurtmani qabul qildim" tugmasini bosdi: yetkazilayotgan buyurtma darhol DELIVERED bo'ladi
   * (admin o'zgartirishi shart emas); admin allaqachon "yetkazildi" degan bo'lsa — faqat tasdiq vaqti yoziladi.
   * Takroriy bosish xato bermaydi (idempotent).
   */
  async confirmReceived(user: AuthUser, id: number) {
    const order = await this.own(user.id, id);
    if (order.receivedAt) return this.get(user.id, id);
    if (!canConfirmReceipt(order)) {
      throw new ConflictException('Buyurtma hali yetkazishga chiqmagan — uni qabul qilganingizni tasdiqlab bo‘lmaydi');
    }
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      if (order.status === OrderStatus.DELIVERING) {
        // Shartli yangilash: shu orada admin holatni o'zgartirgan bo'lsa — qayta tekshiriladi
        const { count } = await tx.order.updateMany({
          where: { id, status: OrderStatus.DELIVERING, receivedAt: null },
          data: { status: OrderStatus.DELIVERED, receivedAt: now },
        });
        if (count) {
          await this.history.record(
            { orderId: id, from: OrderStatus.DELIVERING, to: OrderStatus.DELIVERED, actor: user, note: 'Mijoz qabul qilganini tasdiqladi' },
            tx,
          );
          return;
        }
      }
      await tx.order.updateMany({
        where: { id, status: OrderStatus.DELIVERED, receivedAt: null },
        data: { receivedAt: now },
      });
    });
    await this.audit.log({ actor: user, action: 'Mijoz buyurtmani qabul qildi', category: AuditCategory.ORDER, context: order.code });
    return this.get(user.id, id);
  }

  async cancel(user: AuthUser, id: number) {
    await this.expireStale(user.id);
    const order = await this.own(user.id, id);
    if (!CANCELLABLE.includes(order.status)) {
      throw new ConflictException('Buyurtma qabul qilingan — bekor qilish uchun administratsiyaga murojaat qiling');
    }
    if (order.paymentMethod === PaymentMethod.CARD && order.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException("To'lov qabul qilingan — bekor qilish va pulni qaytarish uchun administratsiyaga murojaat qiling");
    }
    const windowHours = await this.cancelWindow();
    if (!customerCanCancel(order, windowHours)) {
      throw new ConflictException(
        `Buyurtmani faqat berilgandan keyin ${windowHours} soat ichida bekor qilish mumkin — administratsiyaga murojaat qiling`,
      );
    }
    // To'langan bo'lsa pul qaytariladi (operator qo'lda qaytaradi)
    const paymentStatus = order.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : order.paymentStatus;
    const cancelled = await this.release(id, paymentStatus, order.status, user, 'Mijoz bekor qildi');
    // Shu orada admin qabul qilgan bo'lsa — bekor qilinmaydi
    if (!cancelled) {
      throw new ConflictException('Buyurtma qabul qilingan — bekor qilish uchun administratsiyaga murojaat qiling');
    }

    await this.audit.log({ actor: user, action: 'Buyurtma bekor qilindi', category: AuditCategory.ORDER, context: order.code });
    return this.get(user.id, id);
  }
}
