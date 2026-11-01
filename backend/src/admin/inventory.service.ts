import { Injectable } from '@nestjs/common';
import { AuditCategory } from '@prisma/client';
import { KIT360_IDS } from '../kits/kit360';
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
      orderBy: [{ kitId: 'asc' }, { size: 'asc' }],
    });
  }

  /** Zaxira uchun klub formalari ro'yxati (tanlov uchun) — Forma 360° bilan bir xil, bitta jamoaga bitta forma */
  async kitOptions() {
    const kits = await this.prisma.kit.findMany({
      where: { isActive: true, club: { kit360Id: { not: null } } },
      include: { club: true },
      orderBy: { sortOrder: 'asc' },
    });
    const order = new Map(KIT360_IDS.map((id, i) => [id, i]));
    const oneByClub = new Map<number, (typeof kits)[number]>();
    for (const k of kits) if (!oneByClub.has(k.clubId)) oneByClub.set(k.clubId, k);
    return [...oneByClub.values()]
      .map((k) => ({
        kitId: k.id,
        label: k.label,
        clubName: k.club.name,
        bgColor: k.bgColor,
        textColor: k.textColor,
        kit360Id: k.club.kit360Id,
      }))
      .sort((a, b) => (order.get(a.kit360Id as never) ?? 99) - (order.get(b.kit360Id as never) ?? 99));
  }

  async upsert(dto: UpsertInventoryDto, actor: AuditEntry['actor'], ip?: string) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.inventoryItem.upsert({
          where: {
            productType_kitId_size: { productType: item.productType, kitId: item.kitId, size: item.size },
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
      const kits = await this.prisma.kit.findMany({
        where: { id: { in: low.map((i) => i.kitId) } },
        include: { club: true },
      });
      const labelOf = (kitId: number) => {
        const k = kits.find((x) => x.id === kitId);
        return k ? `${k.club.name} — ${k.label}` : `#${kitId}`;
      };
      void this.notify.notify(
        'lowStock',
        `📉 Zaxira kam: ${low.map((i) => `${labelOf(i.kitId)} ${i.size} — ${i.qty} dona`).join('; ')}`,
      );
    }

    return this.list({});
  }
}
