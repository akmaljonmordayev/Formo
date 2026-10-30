import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, DefectStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { CreateDefectDto, ListDefectsQueryDto, ResolveDefectDto } from './dto/workshop-panel.dto';

const include = {
  order: { select: { id: true, code: true, customerName: true, status: true } },
  workshop: { select: { id: true, fullName: true, workshopName: true } },
} satisfies Prisma.DefectReportInclude;

/** Sex topgan nuqson (brak) hisobotlari: sex yaratadi, operator/superadmin ko'rib hal qiladi */
@Injectable()
export class DefectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(workshop: AuthUser, dto: CreateDefectDto, ip?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, workshopId: workshop.id },
      select: { id: true, code: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    const report = await this.prisma.defectReport.create({
      data: { orderId: order.id, workshopId: workshop.id, reason: dto.reason, qty: dto.qty ?? 1, note: dto.note?.trim() || null },
      include,
    });
    await this.audit.log({ actor: workshop, action: 'Sex nuqson (brak) haqida xabar berdi', category: AuditCategory.ORDER, context: order.code, ip });
    return report;
  }

  async listMine(workshop: AuthUser, query: ListDefectsQueryDto) {
    return this.page({ workshopId: workshop.id, ...(query.status && { status: query.status }) }, query);
  }

  async listAll(query: ListDefectsQueryDto) {
    const [page, open] = await Promise.all([
      this.page(query.status ? { status: query.status } : {}, query),
      this.prisma.defectReport.count({ where: { status: DefectStatus.OPEN } }),
    ]);
    return { ...page, openCount: open };
  }

  private async page(where: Prisma.DefectReportWhereInput, query: ListDefectsQueryDto) {
    const { page = 1, limit = 20 } = query;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.defectReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include }),
      this.prisma.defectReport.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async resolve(id: number, dto: ResolveDefectDto, actor: AuthUser, ip?: string) {
    const report = await this.prisma.defectReport.findUnique({ where: { id }, include: { order: { select: { code: true } } } });
    if (!report) throw new NotFoundException('Hisobot topilmadi');
    const updated = await this.prisma.defectReport.update({
      where: { id },
      data: { status: DefectStatus.RESOLVED, resolvedNote: dto.note?.trim() || null, resolvedAt: new Date() },
      include,
    });
    await this.audit.log({ actor, action: 'Nuqson (brak) hal qilindi', category: AuditCategory.ORDER, context: report.order.code, ip });
    return updated;
  }
}
