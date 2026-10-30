import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, OrderStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { RejectOrderDto, WorkshopOrdersQueryDto, WorkshopStatusDto } from './dto/order.dto';
import { OrderHistoryService } from './order-history.service';

// Sex ko'radigan ma'lumot: mahsulot, yetkazish va mijoz kontakti; to'lov/promokod tafsilotlarisiz
const select = {
  id: true,
  code: true,
  status: true,
  customerName: true,
  customerPhone: true,
  productType: true,
  quantity: true,
  deliveryDate: true,
  deliverySlot: true,
  deliveryAddress: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  club: { select: { name: true } },
  items: { orderBy: { id: 'asc' } },
  statusLogs: { orderBy: { id: 'asc' } },
} satisfies Prisma.OrderSelect;

/** Sex ishlab chiqarish bosqichlari tartibi — holat faqat oldinga siljiydi */
const FLOW: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.PRINTING,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
];

const PRODUCTION_COLUMNS: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.PRINTING,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.READY,
];
const ACTIVE_STATUSES: OrderStatus[] = [OrderStatus.SENT_TO_WORKSHOP, ...FLOW];
// Qabul qilingandan 21 soatdan ko'p o'tgan, hali tayyor bo'lmagan vazifalar "kechikkan" (admin paneli bilan bir xil qoida)
const LATE_AFTER_MS = 21 * 60 * 60 * 1000;

const ACTION: Partial<Record<OrderStatus, string>> = {
  PRINTING: 'Sex: bosish boshlandi',
  QUALITY_CHECK: 'Sex: sifat nazoratiga o‘tkazildi',
  READY: 'Sex: buyurtma tayyor',
  DELIVERING: 'Sex: yetkazishga berildi',
};

@Injectable()
export class WorkshopOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly history: OrderHistoryService,
  ) {}

  async list(workshop: AuthUser, query: WorkshopOrdersQueryDto) {
    const { search, status, page = 1, limit = 20 } = query;
    const where: Prisma.OrderWhereInput = { workshopId: workshop.id };
    if (status) where.status = status;
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
        this.prisma.order.findMany({ where, select, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        this.prisma.order.count({ where }),
      ]),
      this.prisma.order.groupBy({ by: ['status'], where: { workshopId: workshop.id }, _count: { _all: true } }),
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>;
    return { items, total, page, limit, byStatus };
  }

  async get(workshop: AuthUser, id: number) {
    const order = await this.prisma.order.findFirst({ where: { id, workshopId: workshop.id }, select });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return order;
  }

  /** Sexning o'z ishlab chiqarish taxtasi: faqat shu sexga biriktirilgan buyurtmalar, bosqichlar bo'yicha */
  async production(workshop: AuthUser) {
    const [orders, me] = await Promise.all([
      this.prisma.order.findMany({
        where: { workshopId: workshop.id, status: { in: PRODUCTION_COLUMNS } },
        select,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.findUnique({ where: { id: workshop.id }, select: { dailyCapacity: true } }),
    ]);
    const lateBefore = new Date(Date.now() - LATE_AFTER_MS);
    const activeCount = await this.prisma.order.count({
      where: { workshopId: workshop.id, status: { in: ACTIVE_STATUSES } },
    });
    const capacity = me?.dailyCapacity ?? null;
    return {
      activeCount,
      capacity,
      loadPct: capacity ? Math.round((activeCount / capacity) * 100) : null,
      lateCount: orders.filter((o) => o.status !== OrderStatus.READY && o.createdAt < lateBefore).length,
      columns: Object.fromEntries(PRODUCTION_COLUMNS.map((s) => [s, orders.filter((o) => o.status === s)])),
    };
  }

  /** Sex statistikasi: davr bo'yicha buyurtmalar soni va kunlik dinamika (faqat o'z buyurtmalari) */
  async stats(workshop: AuthUser, days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const [inPeriod, production] = await Promise.all([
      this.prisma.order.findMany({
        where: { workshopId: workshop.id, createdAt: { gte: from } },
        select: { status: true, createdAt: true },
      }),
      this.production(workshop),
    ]);

    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of inPeriod) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return {
      ordersCount: inPeriod.length,
      activeCount: production.activeCount,
      capacity: production.capacity,
      loadPct: production.loadPct,
      lateCount: production.lateCount,
      dailyTrend: Array.from(buckets.entries()).map(([date, count]) => ({ date, count })),
    };
  }

  /** Sex yuborilgan buyurtmani ko'rib chiqib tasdiqlaydi → ACCEPTED (navbatda) */
  async accept(workshop: AuthUser, id: number, ip?: string) {
    const order = await this.get(workshop, id);
    if (order.status !== OrderStatus.SENT_TO_WORKSHOP) {
      throw new ConflictException(`Buyurtma ${order.status} holatida — qabul qilib bo'lmaydi`);
    }
    return this.move(workshop, order, OrderStatus.ACCEPTED, 'Sex buyurtmani qabul qildi', ip);
  }

  /** Sex buyurtmani ola olmasa — operatorga qaytadi (NEW), boshqa sexga yuboriladi */
  async reject(workshop: AuthUser, id: number, dto: RejectOrderDto, ip?: string) {
    const order = await this.get(workshop, id);
    if (order.status !== OrderStatus.SENT_TO_WORKSHOP) {
      throw new ConflictException('Faqat tasdiqlanmagan (SENT_TO_WORKSHOP) buyurtmani rad etish mumkin');
    }
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, workshopId: workshop.id, status: OrderStatus.SENT_TO_WORKSHOP },
        data: { status: OrderStatus.NEW, workshopId: null },
      });
      if (!count) throw new ConflictException("Buyurtma holati hozirgina o'zgardi");
      await this.history.record(
        { orderId: id, from: OrderStatus.SENT_TO_WORKSHOP, to: OrderStatus.NEW, actor: workshop, note: `Sex rad etdi: ${dto.reason}` },
        tx,
      );
    });
    await this.audit.log({ actor: workshop, action: 'Sex buyurtmani rad etdi', category: AuditCategory.ORDER, context: order.code, ip });
    // Buyurtma endi bu sexga tegishli emas — faqat qisqa natija qaytariladi
    return { id, code: order.code, status: OrderStatus.NEW };
  }

  /** Bosilmoqda → sifat nazorati → tayyor → yetkazishga berildi */
  async updateStatus(workshop: AuthUser, id: number, dto: WorkshopStatusDto, ip?: string) {
    const order = await this.get(workshop, id);
    const from = FLOW.indexOf(order.status);
    const to = FLOW.indexOf(dto.status);
    if (order.status === OrderStatus.SENT_TO_WORKSHOP) {
      throw new ConflictException('Avval buyurtmani qabul qiling (POST /workshop/orders/{id}/accept)');
    }
    if (from < 0) throw new ConflictException(`Buyurtma ${order.status} holatida — o'zgartirib bo'lmaydi`);
    if (to <= from) throw new ConflictException('Holatni faqat oldinga o‘zgartirish mumkin');
    if (dto.status === OrderStatus.DELIVERING && order.status !== OrderStatus.READY) {
      throw new ConflictException('Yetkazishga faqat tayyor (READY) buyurtma beriladi');
    }
    return this.move(workshop, order, dto.status, ACTION[dto.status]!, ip, dto.note);
  }

  private async move(
    workshop: AuthUser,
    order: { id: number; code: string; status: OrderStatus },
    to: OrderStatus,
    action: string,
    ip?: string,
    note?: string,
  ) {
    const { id, status: from } = order;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({ where: { id, workshopId: workshop.id, status: from }, data: { status: to } });
      if (!count) throw new ConflictException("Buyurtma holati hozirgina o'zgardi");
      await this.history.record({ orderId: id, from, to, actor: workshop, note }, tx);
    });
    await this.audit.log({ actor: workshop, action, category: AuditCategory.ORDER, context: order.code, ip });
    return this.get(workshop, id);
  }
}
