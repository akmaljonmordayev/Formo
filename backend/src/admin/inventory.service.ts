import { Injectable } from '@nestjs/common';
import { AuditCategory } from '@prisma/client';
import { LOW_STOCK_THRESHOLD, NotifyService } from '../notify/notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { ListInventoryQueryDto, UpsertInventoryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
  ) {}

  list(query: ListInventoryQueryDto) {
    return this.prisma.inventoryItem.findMany({
      where: query.productType ? { productType: query.productType } : {},
      orderBy: [{ color: 'asc' }, { size: 'asc' }],
    });
  }

  async upsert(dto: UpsertInventoryDto, actor: AuditEntry['actor'], ip?: string) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.inventoryItem.upsert({
          where: {
            productType_color_size: { productType: item.productType, color: item.color, size: item.size },
          },
          create: item,
          update: { qty: item.qty },
        }),
      ),
    );

    await this.audit.log({
      actor,
      action: 'Zaxira qoldig\'i saqlandi',
      category: AuditCategory.CATALOG,
      context: `${dto.items.length} ta yozuv`,
      ip,
    });

    const low = dto.items.filter((i) => i.qty <= LOW_STOCK_THRESHOLD);
    if (low.length) {
      void this.notify.notify(
        'lowStock',
        `📉 Zaxira kam: ${low.map((i) => `${i.color} ${i.size} — ${i.qty} dona`).join('; ')}`,
      );
    }

    return this.list({});
  }
}
