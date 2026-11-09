import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, PromocodeType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { CreatePromocodeDto, UpdatePromocodeDto } from './dto/promocode.dto';

/** DTO'da `value` PERCENT (0-100) va FIXED (so'm, yuqori chegarasiz) uchun bitta maydon —
 *  shuning uchun 100% chegarasini class-validator darajasida emas, shu yerda (yakuniy
 *  type+value holatini bilib) tekshiramiz. pricing.ts checkout paytida 100%ga clamp qiladi,
 *  lekin shu tekshiruv bo'lmasa admin UI/DB'da "500%" kabi chalkash qiymat saqlanib qolaveradi. */
function assertValidValue(type: PromocodeType, value: number | undefined | null) {
  if (type === PromocodeType.PERCENT && value != null && value > 100) {
    throw new BadRequestException("PERCENT turidagi promokod qiymati 100 dan oshmasligi kerak");
  }
}

@Injectable()
export class PromocodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.promocode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreatePromocodeDto, actor: AuditEntry['actor'], ip?: string) {
    assertValidValue(dto.type, dto.value);

    const exists = await this.prisma.promocode.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Bu kod allaqachon mavjud');

    const promo = await this.prisma.promocode.create({
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });

    await this.audit.log({
      actor,
      action: "Promokod yaratildi",
      category: AuditCategory.CATALOG,
      context: promo.code,
      ip,
    });

    return promo;
  }

  async update(id: number, dto: UpdatePromocodeDto, actor: AuditEntry['actor'], ip?: string) {
    const current = await this.prisma.promocode.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Promokod topilmadi');

    assertValidValue(dto.type ?? current.type, dto.value ?? current.value);

    const promo = await this.prisma.promocode.update({
      where: { id },
      data: {
        ...dto,
        // null — sana olib tashlanadi (doimiy promokod), undefined — o'zgarmaydi
        startsAt: dto.startsAt === null ? null : dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt === null ? null : dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });

    await this.audit.log({
      actor,
      action:
        dto.isActive !== undefined && dto.isActive !== current.isActive
          ? dto.isActive
            ? 'Promokod yoqildi'
            : "Promokod o'chirildi"
          : 'Promokod tahrirlandi',
      category: AuditCategory.CATALOG,
      context: promo.code,
      ip,
    });

    return promo;
  }

  async remove(id: number, actor: AuditEntry['actor'], ip?: string) {
    const promo = await this.prisma.promocode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promokod topilmadi');

    // Buyurtmalardagi promocodeId onDelete: SetNull — eski buyurtmalar saqlanadi, faqat bog'lanish uziladi
    await this.prisma.promocode.delete({ where: { id } });

    await this.audit.log({
      actor,
      action: "Promokod butunlay o'chirildi",
      category: AuditCategory.CATALOG,
      context: promo.code,
      ip,
    });

    return { message: "Promokod o'chirildi" };
  }
}
