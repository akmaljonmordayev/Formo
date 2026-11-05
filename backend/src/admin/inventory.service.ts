import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditCategory, InventoryProductType, Prisma } from '@prisma/client';
import { KIT360_IDS } from '../kits/kit360';
import { LOW_STOCK_THRESHOLD, NotifyService } from '../notify/notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { ListInventoryQueryDto, UpsertInventoryDto } from './dto/inventory.dto';

/** Checkout/bekor qilish oqimlarida zaxira bilan bog'lanadigan qator — faqat klub formasi (kitId bor) */
export interface InventoryOrderLine {
  kitId: number | null;
  shirtSize: string;
  shortsSize: string | null;
  withShorts: boolean;
  quantity: number;
  /** Faqat reserve() uchun — zaxira yetmasa xato xabarida ko'rsatiladi */
  label?: string;
}

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

  /** Bitta formaning shu turdagi (futbolka/shortik) barcha o'lchamlari qoldig'ini o'chiradi */
  async removeKit(kitId: number, productType: InventoryProductType, actor: AuditEntry['actor'], ip?: string) {
    const { count } = await this.prisma.inventoryItem.deleteMany({ where: { kitId, productType } });
    if (count) {
      await this.audit.log({
        actor,
        action: "Zaxira qoldig'i o'chirildi",
        category: AuditCategory.CATALOG,
        context: `forma #${kitId}, ${productType}: ${count} ta o'lcham`,
        ip,
      });
    }
    return { deleted: count };
  }

  /**
   * Checkout tranzaksiyasi ichida chaqiriladi: har bir klub formasi (kitId bor) qatori uchun
   * komplekt zaxirasini (TSHIRT qatori) shartli kamaytiradi — `qty >= so'ralgan`
   * bo'lgandagina (conditional update, wallet.debit bilan bir xil uslub). Yetarli bo'lmasa butun
   * tranzaksiya (va shu bilan oldingi decrementlar) qaytishi uchun shu yerda xato tashlanadi.
   *
   * `InventoryItem` yozuvi umuman yo'q o'lcham — hali hech kim shu forma uchun ombor kiritmagan,
   * "kuzatilmagan" deb hisoblanadi va cheklovsiz o'tkaziladi (oldin bu funksiya umuman ishlamagan,
   * demak hozircha kuzatilmagan narsalarni to'satdan bloklash noto'g'ri bo'lardi).
   */
  async reserve(tx: Prisma.TransactionClient, lines: InventoryOrderLine[]) {
    for (const line of lines) {
      if (line.kitId == null) continue; // faqat klub formasi (CLUB_KIT) ombor bilan kuzatiladi
      // Komplekt (futbolka + shortik) bitta qoldiq — o'lcham futbolka o'lchami bo'yicha
      await this.decrementOne(tx, line.kitId, line.shirtSize, InventoryProductType.TSHIRT, line.quantity, line.label);
    }
  }

  private async decrementOne(
    tx: Prisma.TransactionClient,
    kitId: number,
    size: string,
    productType: InventoryProductType,
    qty: number,
    label?: string,
  ) {
    const existing = await tx.inventoryItem.findUnique({ where: { productType_kitId_size: { productType, kitId, size } } });
    if (!existing) return; // kuzatilmagan — cheklov yo'q
    const { count } = await tx.inventoryItem.updateMany({
      where: { productType, kitId, size, qty: { gte: qty } },
      data: { qty: { decrement: qty } },
    });
    if (!count) {
      throw new BadRequestException(`${label ?? `Kit #${kitId}`}: ${size} o'lchami uchun zaxira yetarli emas`);
    }
  }

  /**
   * Buyurtma bekor qilinganda/qaytarilganda `reserve()` da kamaytirilgan zaxirani orqaga qaytaradi.
   * Faqat hozir ham kuzatilayotgan (InventoryItem yozuvi mavjud) o'lchamlar uchun — `reserve()` bilan
   * bir xil siyosat, aks holda keyin qo'shilgan kuzatuv yozuvini asossiz oshirib qo'yish mumkin edi.
   */
  async restore(tx: Prisma.TransactionClient, lines: InventoryOrderLine[]) {
    for (const line of lines) {
      if (line.kitId == null) continue;
      await tx.inventoryItem.updateMany({
        where: { productType: InventoryProductType.TSHIRT, kitId: line.kitId, size: line.shirtSize },
        data: { qty: { increment: line.quantity } },
      });
    }
  }
}
