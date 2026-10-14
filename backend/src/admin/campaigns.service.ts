import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const campaigns = await this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
    const totals = campaigns.reduce(
      (acc, c) => ({
        sent: acc.sent + (c.sentCount ?? 0),
        opened: acc.opened + (c.openedCount ?? 0),
        orders: acc.orders + (c.orderCount ?? 0),
        revenue: acc.revenue + (c.revenue ?? 0),
      }),
      { sent: 0, opened: 0, orders: 0, revenue: 0 },
    );
    return { items: campaigns, totals };
  }

  async create(dto: CreateCampaignDto, actor: AuditEntry['actor'], ip?: string) {
    const campaign = await this.prisma.campaign.create({
      data: { ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined },
    });

    await this.audit.log({
      actor,
      action: 'Kampaniya yaratildi',
      category: AuditCategory.SETTING,
      context: campaign.name,
      ip,
    });

    return campaign;
  }

  async update(id: number, dto: UpdateCampaignDto, actor: AuditEntry['actor'], ip?: string) {
    const current = await this.prisma.campaign.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Kampaniya topilmadi');

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: { ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined },
    });

    await this.audit.log({
      actor,
      action: 'Kampaniya tahrirlandi',
      category: AuditCategory.SETTING,
      context: campaign.name,
      ip,
    });

    return campaign;
  }
}
