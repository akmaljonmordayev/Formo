import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { AssignWorkshopDto, ListOrdersQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderHistoryService } from './order-history.service';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.SENT_TO_WORKSHOP,
  OrderStatus.ACCEPTED,
  OrderStatus.PRINTING,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
];
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.SENT_TO_WORKSHOP,
  OrderStatus.ACCEPTED,
  OrderStatus.PRINTING,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
];

export const include = {
  club: { select: { name: true } },
  items: { orderBy: { id: 'asc' } },
  workshop: { select: { id: true, fullName: true, workshopName: true, phone: true } },
} satisfies Prisma.OrderInclude;

export const detailInclude = {
  ...include,
  promocode: { select: { code: true } },
  statusLogs: { orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude;

/** Operator sexga yubora oladigan holatlar: yangi yoki hali sex tasdiqlamagan (qayta biriktirish) */
const ASSIGNABLE: OrderStatus[] = [OrderStatus.NEW, OrderStatus.SENT_TO_WORKSHOP];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly history: OrderHistoryService,
  ) {}

  async list(query: ListOrdersQueryDto) {
    const { search, status, workshopId, page = 1, limit = 20 } = query;
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (workshopId) where.workshopId = workshopId;
    if (search) {
      const digits = search.replace(/\D/g, '');
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        ...(digits ? [{ customerPhone: { contains: digits } }] : []),
      ];
    }

    const [[items, total], counts] = await Promise.all([
      this.prisma.$transaction([
        this.prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include,
        }),
        this.prisma.order.count({ where }),
      ]),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>;
    return { items, total, page, limit, byStatus };
  }

  async get(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: detailInclude });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return order;
  }

  /** Operator buyurtmani tekshirib, tikuv sexiga yuboradi (yoki hali tasdiqlanmagan bo'lsa boshqa sexga o'tkazadi) */
  async assign(id: number, dto: AssignWorkshopDto, actor: NonNullable<AuditEntry['actor']>, ip?: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { status: true, code: true } });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    if (!ASSIGNABLE.includes(order.status)) {
      throw new ConflictException(
        order.status === OrderStatus.PENDING_PAYMENT
          ? "Buyurtma hali to'lanmagan"
          : 'Buyurtmani faqat NEW yoki SENT_TO_WORKSHOP holatida sexga yuborish mumkin',
      );
    }
    const workshop = await this.prisma.user.findFirst({
      where: { id: dto.workshopId, role: Role.TAILOR },
      select: { isActive: true, workshopName: true, fullName: true },
    });
    if (!workshop) throw new BadRequestException('Tikuv sexi topilmadi');
    if (!workshop.isActive) throw new BadRequestException('Tikuv sexi bloklangan');

    await this.prisma.$transaction(async (tx) => {
      // Shu orada holat o'zgargan bo'lsa (mijoz bekor qildi, sex qabul qildi) — yozilmaydi
      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status: OrderStatus.SENT_TO_WORKSHOP, workshopId: dto.workshopId },
      });
      if (!count) throw new ConflictException("Buyurtma holati hozirgina o'zgardi, qayta urinib ko'ring");
      await this.history.record({ orderId: id, from: order.status, to: OrderStatus.SENT_TO_WORKSHOP, actor, note: dto.note }, tx);
    });

    await this.audit.log({
      actor,
      action: `Buyurtma sexga yuborildi: ${workshop.workshopName || workshop.fullName}`,
      category: AuditCategory.ORDER,
      context: order.code,
      ip,
    });
    return this.get(id);
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto, actor: AuditEntry['actor'], ip?: string) {
    const current = await this.prisma.order.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Buyurtma topilmadi');

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: dto.status, ...(dto.workshopId !== undefined && { workshopId: dto.workshopId }) },
        include,
      });
      if (current.status !== dto.status) {
        await this.history.record({ orderId: id, from: current.status, to: dto.status, actor, note: dto.note }, tx);
      }
      return updated;
    });

    await this.audit.log({
      actor,
      action: dto.status === OrderStatus.CANCELLED ? 'Buyurtma bekor qilindi' : "Buyurtma holati o'zgartirildi",
      category: AuditCategory.ORDER,
      context: order.code,
      ip,
    });

    return order;
  }

  /** Dashboard/hisobotlar uchun berilgan davr bo'yicha xom buyurtmalar — aggregatsiya shu ustida hisoblanadi */
  private ordersSince(from: Date) {
    return this.prisma.order.findMany({
      where: { createdAt: { gte: from } },
      select: {
        id: true,
        totalSum: true,
        deliverySum: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        productType: true,
        createdAt: true,
      },
    });
  }

  async dashboardStats(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);

    const [current, previous, lateCount] = await Promise.all([
      this.ordersSince(from),
      this.prisma.order.findMany({
        where: { createdAt: { gte: prevFrom, lt: from } },
        select: { totalSum: true, status: true },
      }),
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.ACCEPTED, OrderStatus.PRINTING, OrderStatus.QUALITY_CHECK] },
          // "muddatga 3 soatdan kam" — qabul qilingandan 21 soatdan ko'p o'tgan, hali tayyor bo'lmagan vazifalar
          createdAt: { lt: new Date(Date.now() - 21 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const ordersCount = current.filter((o) => o.status !== OrderStatus.CANCELLED).length;
    const prevOrdersCount = previous.filter((o) => o.status !== OrderStatus.CANCELLED).length;
    const revenue = current.filter((o) => REVENUE_STATUSES.includes(o.status)).reduce((s, o) => s + o.totalSum, 0);
    const prevRevenue = previous
      .filter((o) => REVENUE_STATUSES.includes(o.status))
      .reduce((s, o) => s + o.totalSum, 0);

    const [activeCount, capacityAgg] = await Promise.all([
      this.prisma.order.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      this.prisma.user.aggregate({ where: { role: 'TAILOR', isActive: true }, _sum: { dailyCapacity: true } }),
    ]);
    const capacity = capacityAgg._sum.dailyCapacity ?? 0;
    const dailyTrend = this.groupByDay(current, days);

    return {
      ordersCount,
      ordersDeltaPct: pctDelta(ordersCount, prevOrdersCount),
      revenue,
      revenueDeltaPct: pctDelta(revenue, prevRevenue),
      activeCount,
      capacity,
      loadPct: capacity ? Math.round((activeCount / capacity) * 100) : null,
      lateCount,
      dailyTrend,
    };
  }

  async financeStats(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);

    const [current, previous] = await Promise.all([
      this.ordersSince(from),
      this.prisma.order.findMany({
        where: { createdAt: { gte: prevFrom, lt: from } },
        select: { totalSum: true, status: true },
      }),
    ]);

    const revenueOrders = current.filter((o) => REVENUE_STATUSES.includes(o.status));
    const revenue = revenueOrders.reduce((s, o) => s + o.totalSum, 0);
    const prevRevenue = previous
      .filter((o) => REVENUE_STATUSES.includes(o.status))
      .reduce((s, o) => s + o.totalSum, 0);
    const refunded = current.filter((o) => o.status === OrderStatus.RETURNED).reduce((s, o) => s + o.totalSum, 0);

    const byMethod: Record<string, { count: number; sum: number }> = {};
    for (const o of revenueOrders) {
      const key = o.paymentMethod;
      byMethod[key] ??= { count: 0, sum: 0 };
      byMethod[key].count += 1;
      byMethod[key].sum += o.totalSum;
    }

    return {
      revenue,
      revenueDeltaPct: pctDelta(revenue, prevRevenue),
      refunded,
      byMethod,
    };
  }

  async reportsStats(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);

    const [current, previous] = await Promise.all([
      this.ordersSince(from),
      this.ordersSince(prevFrom).then((all) => all.filter((o) => o.createdAt < from)),
    ]);

    const revenueOrders = current.filter((o) => REVENUE_STATUSES.includes(o.status));
    const revenue = revenueOrders.reduce((s, o) => s + o.totalSum, 0);
    const prevRevenue = previous
      .filter((o) => REVENUE_STATUSES.includes(o.status))
      .reduce((s, o) => s + o.totalSum, 0);
    const ordersCount = current.filter((o) => o.status !== OrderStatus.CANCELLED).length;
    const prevOrdersCount = previous.filter((o) => o.status !== OrderStatus.CANCELLED).length;
    const avgCheck = ordersCount ? Math.round(revenue / ordersCount) : 0;

    const byProductType: Record<string, number> = {};
    for (const o of revenueOrders) {
      byProductType[o.productType] = (byProductType[o.productType] ?? 0) + o.totalSum;
    }

    return {
      revenue,
      revenueDeltaPct: pctDelta(revenue, prevRevenue),
      ordersCount,
      ordersDeltaPct: pctDelta(ordersCount, prevOrdersCount),
      avgCheck,
      byProductType,
    };
  }

  /** "Ishlab chiqarish" kanban: workshop (sex) bo'yicha yuk va 4 ustunli bosqichlar */
  async production() {
    const [workshops, printingOrders] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'TAILOR', isActive: true },
        select: {
          id: true,
          fullName: true,
          workshopName: true,
          dailyCapacity: true,
          _count: { select: { ordersAsWorkshop: { where: { status: { in: ACTIVE_STATUSES } } } } },
        },
      }),
      this.prisma.order.findMany({
        where: { status: { in: [OrderStatus.ACCEPTED, OrderStatus.PRINTING, OrderStatus.QUALITY_CHECK, OrderStatus.READY] } },
        orderBy: { createdAt: 'asc' },
        include,
      }),
    ]);

    const lateCount = printingOrders.filter(
      (o) => o.status !== OrderStatus.READY && o.createdAt < new Date(Date.now() - 21 * 60 * 60 * 1000),
    ).length;

    return {
      workshops: workshops.map((w) => ({
        id: w.id,
        name: w.workshopName || w.fullName,
        activeCount: w._count.ordersAsWorkshop,
        capacity: w.dailyCapacity ?? null,
        loadPct: w.dailyCapacity ? Math.round((w._count.ordersAsWorkshop / w.dailyCapacity) * 100) : null,
      })),
      lateCount,
      columns: {
        ACCEPTED: printingOrders.filter((o) => o.status === OrderStatus.ACCEPTED),
        PRINTING: printingOrders.filter((o) => o.status === OrderStatus.PRINTING),
        QUALITY_CHECK: printingOrders.filter((o) => o.status === OrderStatus.QUALITY_CHECK),
        READY: printingOrders.filter((o) => o.status === OrderStatus.READY),
      },
    };
  }

  private groupByDay(orders: { totalSum: number; status: OrderStatus; createdAt: Date }[], days: number) {
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of orders) {
      if (o.status === OrderStatus.CANCELLED) continue;
      const key = o.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  }
}

function pctDelta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
