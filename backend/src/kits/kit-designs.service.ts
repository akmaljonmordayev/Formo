import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory } from '@prisma/client';
import { AuditEntry, AuditService } from '../admin/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { loadKitDesignPrices } from '../shop/pricing';
import { detectImage } from '../storage/file-type';
import { StorageService } from '../storage/storage.service';
import { CreateKitDesignDto, KitDesignBodyDto, UpdateKitDesignDto, UPLOAD_KINDS } from './dto/kit-design.dto';
import { toAdminView, toDesignV1 } from './kit-design';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_THUMBNAIL_BYTES = 1024 * 1024;
const IMAGE_PREFIX = 'kits/';

type Actor = AuditEntry['actor'];
/** multer xotirada bergan fayl (servisga faqat shu ikki maydon kerak) */
export type UploadedImage = { buffer: Buffer; size: number };

const ORDER = [{ sortOrder: 'asc' as const }, { id: 'asc' as const }];

@Injectable()
export class KitDesignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  // ─── Admin ────────────────────────────────────────────────────────────────

  async list() {
    const rows = await this.prisma.kitDesign.findMany({ orderBy: ORDER });
    return rows.map(toAdminView);
  }

  async get(id: number) {
    return toAdminView(await this.find(id));
  }

  async create(dto: CreateKitDesignDto, actor: Actor, ip?: string) {
    const row = await this.prisma.kitDesign.create({
      data: { ...this.designData(dto.design), isActive: dto.isActive ?? false, sortOrder: dto.sortOrder ?? 0 },
    });
    await this.audit.log({ actor, action: '3D dizayn qo\'shildi', category: AuditCategory.CATALOG, context: row.name, ip });
    return toAdminView(row);
  }

  async update(id: number, dto: UpdateKitDesignDto, actor: Actor, ip?: string) {
    const current = await this.find(id);
    const row = await this.prisma.kitDesign.update({
      where: { id },
      data: {
        ...(dto.design && this.designData(dto.design)),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    const action =
      dto.isActive !== undefined && dto.isActive !== current.isActive
        ? dto.isActive
          ? '3D dizayn nashr qilindi'
          : '3D dizayn nashrdan olindi'
        : '3D dizayn tahrirlandi';
    await this.audit.log({ actor, action, category: AuditCategory.CATALOG, context: row.name, ip });
    return toAdminView(row);
  }

  /**
   * O'chiriladi; savatdagi qatorlar ham ketadi (Cascade), buyurtmalarda esa designSnapshot qoladi (SetNull).
   * Nishon/homiy rasmlari o'chirilmaydi — eski buyurtma snapshot'lari ularga murojaat qiladi.
   */
  async remove(id: number, actor: Actor, ip?: string) {
    const row = await this.find(id);
    await this.prisma.kitDesign.delete({ where: { id } });
    await this.storage.remove(row.thumbnailUrl);
    await this.audit.log({ actor, action: "3D dizayn o'chirildi", category: AuditCategory.CATALOG, context: row.name, ip });
    return { message: "3D dizayn o'chirildi" };
  }

  /** Nishon yoki homiy rasmi: PNG/JPEG/WEBP (haqiqiy turi baytlardan), 2 MB gacha */
  async upload(kind: (typeof UPLOAD_KINDS)[number], file: UploadedImage | undefined) {
    const type = this.checkImage(file, MAX_IMAGE_BYTES);
    const url = await this.storage.put(`${IMAGE_PREFIX}${kind}`, type.ext, (file as UploadedImage).buffer, type.mime);
    return { url };
  }

  /** Ro'yxatdagi kichik rasm: tahrirlovchi saqlashda bir marta chizgan PNG, 1 MB gacha */
  async setThumbnail(id: number, file: UploadedImage | undefined) {
    const current = await this.find(id);
    const type = this.checkImage(file, MAX_THUMBNAIL_BYTES);
    if (type.ext !== 'png') throw new BadRequestException('Kichik rasm PNG bo\'lishi kerak');
    const url = await this.storage.put(`${IMAGE_PREFIX}thumb`, 'png', (file as UploadedImage).buffer, type.mime);
    const row = await this.prisma.kitDesign.update({ where: { id }, data: { thumbnailUrl: url } });
    await this.storage.remove(current.thumbnailUrl);
    return toAdminView(row);
  }

  // ─── Mobil (ochiq) ────────────────────────────────────────────────────────

  /** Faqat nashr qilinganlar, tartib bo'yicha; narx — server narx jadvalidan */
  async listPublished() {
    const [rows, prices] = await Promise.all([
      this.prisma.kitDesign.findMany({ where: { isActive: true }, orderBy: ORDER }),
      loadKitDesignPrices(this.prisma),
    ]);
    return rows.map((r) => this.publicView(r, prices));
  }

  async getPublished(id: number) {
    const [row, prices] = await Promise.all([
      this.prisma.kitDesign.findFirst({ where: { id, isActive: true } }),
      loadKitDesignPrices(this.prisma),
    ]);
    if (!row) throw new NotFoundException('Dizayn topilmadi');
    return this.publicView(row, prices);
  }

  // ─── Yordamchilar ─────────────────────────────────────────────────────────

  private publicView(row: Parameters<typeof toDesignV1>[0] & { id: number; thumbnailUrl: string | null }, prices: Awaited<ReturnType<typeof loadKitDesignPrices>>) {
    return {
      id: row.id,
      name: row.name,
      thumbnailUrl: row.thumbnailUrl,
      design: toDesignV1(row),
      prices: { shirt: prices.shirtPrice, shorts: prices.shortsPrice, print: prices.printPrice },
    };
  }

  private async find(id: number) {
    const row = await this.prisma.kitDesign.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Dizayn topilmadi');
    return row;
  }

  private designData(d: KitDesignBodyDto) {
    for (const [field, url] of [
      ['crestImageUrl', d.crestImageUrl],
      ['sponsorImageUrl', d.sponsorImageUrl],
    ] as const) {
      if (url && !this.storage.isOwnUrl(url, IMAGE_PREFIX)) {
        throw new BadRequestException(`${field}: rasm avval shu panel orqali yuklanishi kerak`);
      }
    }
    return {
      name: d.name,
      primaryColor: d.primaryColor,
      secondaryColor: d.secondaryColor,
      textColor: d.textColor,
      pattern: d.pattern,
      neck: d.neck,
      sponsorText: d.sponsorText ?? '',
      backTopText: d.backTopText ?? '',
      crestImageUrl: d.crestImageUrl ?? null,
      sponsorImageUrl: d.sponsorImageUrl ?? null,
    };
  }

  private checkImage(file: UploadedImage | undefined, max: number) {
    if (!file?.buffer?.length) throw new BadRequestException('Fayl yuborilmadi (maydon nomi: file)');
    if (file.size > max) throw new BadRequestException(`Fayl ${Math.round(max / 1024 / 1024) || 1} MB dan katta`);
    const type = detectImage(file.buffer);
    if (!type) throw new BadRequestException('Faqat PNG, JPEG yoki WEBP rasm qabul qilinadi');
    return type;
  }
}
