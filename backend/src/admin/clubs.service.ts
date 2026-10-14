import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { CreateClubDto, ListClubsQueryDto, UpdateClubDto } from './dto/club.dto';

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListClubsQueryDto) {
    const { league, page = 1, limit = 50 } = query;
    const where: Prisma.ClubWhereInput = league ? { league } : {};

    const [clubs, total] = await this.prisma.$transaction([
      this.prisma.club.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          kits: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { orders: { where: { status: { not: OrderStatus.CANCELLED } } } } },
        },
      }),
      this.prisma.club.count({ where }),
    ]);

    return {
      items: clubs.map((c) => ({ ...c, sold: c._count.orders, _count: undefined })),
      total,
      page,
      limit,
    };
  }

  async create(dto: CreateClubDto, actor: AuditEntry['actor'], ip?: string) {
    const exists = await this.prisma.club.findUnique({
      where: { name_season: { name: dto.name, season: dto.season } },
    });
    if (exists) throw new ConflictException('Bu klub shu mavsum uchun allaqachon qo\'shilgan');

    const club = await this.prisma.club.create({
      data: {
        name: dto.name,
        league: dto.league,
        season: dto.season,
        code: dto.code,
        markColor: dto.markColor,
        kits: { create: dto.kits.map((k, i) => ({ ...k, sortOrder: i })) },
      },
      include: { kits: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.audit.log({
      actor,
      action: "Klub qo'shildi",
      category: AuditCategory.CATALOG,
      context: `club · ${club.name}`,
      ip,
    });

    return club;
  }

  async update(id: number, dto: UpdateClubDto, actor: AuditEntry['actor'], ip?: string) {
    const current = await this.prisma.club.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Klub topilmadi');

    const { kits, ...rest } = dto;
    const club = await this.prisma.club.update({
      where: { id },
      data: {
        ...rest,
        ...(kits && {
          kits: {
            deleteMany: {},
            create: kits.map((k, i) => ({ ...k, sortOrder: i })),
          },
        }),
      },
      include: { kits: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.audit.log({
      actor,
      action: "Klub tahrirlandi",
      category: AuditCategory.CATALOG,
      context: `club · ${club.name}`,
      ip,
    });

    return club;
  }

  async remove(id: number, actor: AuditEntry['actor'], ip?: string) {
    const club = await this.prisma.club.findUnique({ where: { id } });
    if (!club) throw new NotFoundException('Klub topilmadi');
    await this.prisma.club.delete({ where: { id } });

    await this.audit.log({
      actor,
      action: "Klub o'chirildi",
      category: AuditCategory.CATALOG,
      context: `club · ${club.name}`,
      ip,
    });

    return { message: "Klub o'chirildi" };
  }
}
