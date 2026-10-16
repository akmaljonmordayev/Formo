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
