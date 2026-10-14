import { Injectable } from '@nestjs/common';
import { AuditCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { UpsertPricingDto } from './dto/pricing.dto';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.pricingItem.findMany({ orderBy: [{ step: 'asc' }, { sortOrder: 'asc' }] });
  }

  async upsert(dto: UpsertPricingDto, actor: AuditEntry['actor'], ip?: string) {
    await this.prisma.$transaction(
      dto.items.map((item, i) =>
        this.prisma.pricingItem.upsert({
          where: { key: item.key },
          create: { ...item, sortOrder: i },
          update: { ...item, sortOrder: i },
        }),
      ),
    );

    await this.audit.log({
      actor,
      action: "Narx o'zgartirildi",
      category: AuditCategory.CATALOG,
      context: `${dto.items.length} ta narx`,
      ip,
    });

    return this.list();
  }
}
