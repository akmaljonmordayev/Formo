import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { CreatePromocodeDto, UpdatePromocodeDto } from './dto/promocode.dto';

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

    const promo = await this.prisma.promocode.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
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
}
