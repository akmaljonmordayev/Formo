import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { CategoriesService } from './categories.service';
import { ClubKitDto, CreateClubDto, KitDto, ListClubsQueryDto, UpdateClubDto, UpdateKitDto } from './dto/club.dto';

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
    const { league, categoryId, type, continent, kit360Id, page = 1, limit = 50 } = query;
    const where: Prisma.ClubWhereInput = {
      ...(league && { league }),
      ...(categoryId && { categoryId }),
      ...(type && { type }),
      ...(continent && { continent }),
      ...(kit360Id && { kit360Id: kit360Id === 'any' ? { not: null } : kit360Id }),
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
          type: dto.type,
          continent: dto.continent,
          kit360Id: dto.kit360Id ?? null,
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
      action:
        dto.kit360Id !== undefined && dto.kit360Id !== current.kit360Id
          ? `Klub tahrirlandi (Forma 360°: ${current.kit360Id ?? '—'} → ${dto.kit360Id ?? '—'})`
          : "Klub tahrirlandi",
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

  /** "Formalar" sahifasi uchun — barcha klublarning barcha formalari bitta yassi ro'yxatda */
  async listKits() {
    return this.prisma.kit.findMany({
      orderBy: [{ club: { name: 'asc' } }, { sortOrder: 'asc' }],
      include: { club: { select: { id: true, name: true, code: true, markColor: true, season: true } } },
    });
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

  /** Klubga yangi forma (oxiriga qo'shiladi) */
  async createKit(clubId: number, dto: KitDto, actor: AuditEntry['actor'], ip?: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
    if (!club) throw new NotFoundException('Klub topilmadi');
    const last = await this.prisma.kit.aggregate({ where: { clubId }, _max: { sortOrder: true } });
    const kit = await this.prisma.kit.create({ data: { ...dto, clubId, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    await this.audit.log({ actor, action: "Forma qo'shildi", category: AuditCategory.CATALOG, context: `${club.name} · ${kit.label}`, ip });
    return kit;
  }

  /**
   * Formani o'chirish. Buyurtmalardagi qatorlar o'z nusxasini saqlaydi (kitId → null), savat va zaxira yozuvlari o'chadi.
   * Klubning oxirgi formasi o'chirilmaydi — katalog, Narxlar va Zaxira shu formaga tayanadi.
   */
  async removeKit(id: number, actor: AuditEntry['actor'], ip?: string) {
    const kit = await this.prisma.kit.findUnique({ where: { id }, include: { club: { select: { name: true } } } });
    if (!kit) throw new NotFoundException('Forma topilmadi');
    if ((await this.prisma.kit.count({ where: { clubId: kit.clubId } })) <= 1) {
      throw new ConflictException("Klubning yagona formasini o'chirib bo'lmaydi — avval yangisini qo'shing");
    }
    await this.prisma.kit.delete({ where: { id } });
    await this.audit.log({ actor, action: "Forma o'chirildi", category: AuditCategory.CATALOG, context: `${kit.club.name} · ${kit.label}`, ip });
    return { message: "Forma o'chirildi" };
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
