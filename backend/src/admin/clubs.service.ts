import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { CategoriesService } from './categories.service';
import { ClubKitDto, CreateClubDto, ListClubsQueryDto, UpdateClubDto, UpdateKitDto } from './dto/club.dto';

const clubInclude = {
  category: { select: { id: true, name: true, slug: true } },
  kits: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ClubInclude;

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly categories: CategoriesService,
  ) {}

  async list(query: ListClubsQueryDto) {
    const { league, categoryId, page = 1, limit = 50 } = query;
    const where: Prisma.ClubWhereInput = {
      ...(league && { league }),
      ...(categoryId && { categoryId }),
    };

    const [clubs, total] = await this.prisma.$transaction([
      this.prisma.club.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ...clubInclude,
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

    const club = await this.prisma.$transaction(async (tx) => {
      const category = await this.categories.resolve(tx, dto);
      return tx.club.create({
        data: {
          name: dto.name,
          league: category?.name ?? dto.league ?? '',
          categoryId: category?.id,
          season: dto.season,
          code: dto.code,
          markColor: dto.markColor,
          kits: { create: dto.kits.map(({ id: _id, ...k }, i) => ({ ...k, sortOrder: i })) },
        },
        include: clubInclude,
      });
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

    const { kits, categoryId, league, ...rest } = dto;
    const club = await this.prisma.$transaction(async (tx) => {
      const category =
        categoryId !== undefined || league !== undefined ? await this.categories.resolve(tx, { categoryId, league }) : undefined;
      return tx.club.update({
        where: { id },
        data: {
          ...rest,
          ...(category !== undefined && { league: category?.name ?? league, categoryId: category?.id ?? null }),
          ...(kits && { kits: await this.kitsUpdate(tx, id, kits) }),
        },
        include: clubInclude,
      });
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

  /**
   * Formalarni joyida yangilaydi: id li forma tahrirlanadi, id siz — yaratiladi, ro'yxatda yo'qlari o'chiriladi.
   * (Hammasini o'chirib qayta yaratish savatdagi va buyurtmadagi bog'lanishlarni uzib yuborardi.)
   */
  private async kitsUpdate(tx: Prisma.TransactionClient, clubId: number, kits: ClubKitDto[]) {
    const ids = kits.flatMap((k) => (k.id ? [k.id] : []));
    if (ids.length) {
      const owned = await tx.kit.count({ where: { clubId, id: { in: ids } } });
      if (owned !== new Set(ids).size) throw new BadRequestException('Forma bu klubga tegishli emas');
    }
    const rows = kits.map((k, sortOrder) => ({ ...k, sortOrder }));
    return {
      deleteMany: { id: { notIn: ids } },
      update: rows.filter((k) => k.id).map(({ id, ...data }) => ({ where: { id }, data })),
      create: rows.filter((k) => !k.id).map(({ id: _id, ...data }) => data),
    } satisfies Prisma.KitUpdateManyWithoutClubNestedInput;
  }

  async updateKit(id: number, dto: UpdateKitDto, actor: AuditEntry['actor'], ip?: string) {
    const current = await this.prisma.kit.findUnique({ where: { id }, include: { club: { select: { name: true } } } });
    if (!current) throw new NotFoundException('Forma topilmadi');
    const kit = await this.prisma.kit.update({ where: { id }, data: dto });

    await this.audit.log({
      actor,
      action: 'Forma tahrirlandi',
      category: AuditCategory.CATALOG,
      context: `${current.club.name} · ${kit.label}`,
      ip,
    });
    return kit;
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
