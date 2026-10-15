import { Injectable, NotFoundException } from '@nestjs/common';
import { Kit, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListCatalogClubsQueryDto } from './dto/catalog.dto';
import { ADULT_SIZES, ALL_SIZES, fullSetPrice, KID_SIZES } from './pricing';

/** Mijozga ko'rinadigan klub: faqat faol, kategoriyasi bo'lmasa yoki faol kategoriyada */
export const visibleClub: Prisma.ClubWhereInput = {
  isActive: true,
  OR: [{ categoryId: null }, { category: { isActive: true } }],
};

const clubCard = {
  id: true,
  name: true,
  league: true,
  season: true,
  code: true,
  markColor: true,
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { kits: { where: { isActive: true } } } },
} satisfies Prisma.ClubSelect;

type ClubCardRow = Prisma.ClubGetPayload<{ select: typeof clubCard }>;

const toClubCard = ({ _count, ...c }: ClubCardRow) => ({ ...c, kitsCount: _count.kits });

/** Forma (mahsulot) — narxlari bilan */
export function toKitProduct(kit: Kit) {
  return {
    id: kit.id,
    clubId: kit.clubId,
    label: kit.label,
    title: `${kit.label} formasi`,
    bgColor: kit.bgColor,
    textColor: kit.textColor,
    colorsLabel: kit.colorsLabel,
    description: kit.description,
    includes: 'Futbolka + shortik',
    price: fullSetPrice(kit),
    priceBreakdown: { shirt: kit.shirtPrice, shorts: kit.shortsPrice, print: kit.printPrice },
    sizes: ALL_SIZES.map((size) => ({ size, available: kit.sizes.includes(size) })).filter(
      (s) => s.available || (ADULT_SIZES as readonly string[]).includes(s.size),
    ),
  };
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Katalogdagi filtr chiplari (Barchasi, LaLiga, Premier League ...) */
  async categories() {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { clubs: { where: { isActive: true } } } },
      },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, clubsCount: _count.clubs }));
  }

  async clubs(query: ListCatalogClubsQueryDto) {
    const { categoryId, category, search, page = 1, limit = 50 } = query;
    const where: Prisma.ClubWhereInput = { AND: [visibleClub] };
    const and = where.AND as Prisma.ClubWhereInput[];
    if (categoryId) and.push({ categoryId });
    if (category) and.push({ category: { slug: category } });
    if (search) and.push({ name: { contains: search, mode: 'insensitive' } });

    const [items, total] = await this.prisma.$transaction([
      this.prisma.club.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: clubCard,
      }),
      this.prisma.club.count({ where }),
    ]);
    return { items: items.map(toClubCard), total, page, limit };
  }

  /** "Mashhur klublar" — eng ko'p buyurtma qilinganlar */
  async popular(limit = 8) {
    const clubs = await this.prisma.club.findMany({
      where: visibleClub,
      orderBy: [{ orders: { _count: 'desc' } }, { name: 'asc' }],
      take: limit,
      select: {
        ...clubCard,
        _count: {
          select: {
            kits: { where: { isActive: true } },
            orders: { where: { status: { not: OrderStatus.CANCELLED } } },
          },
        },
      },
    });
    return clubs.map(({ _count, ...c }) => ({ ...c, kitsCount: _count.kits, ordersCount: _count.orders }));
  }

  /** Klub sahifasi: Uy / Mehmon / Uchinchi formalari narxi bilan */
  async club(id: number) {
    const club = await this.prisma.club.findFirst({
      where: { id, ...visibleClub },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        kits: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!club) throw new NotFoundException('Klub topilmadi');
    const { kits, createdAt: _c, updatedAt: _u, isActive: _a, ...rest } = club;
    return { ...rest, kits: kits.map(toKitProduct) };
  }

  /** Forma tafsiloti: old/orqa ko'rinish, boshqa formalar, narx tarkibi, o'lchamlar */
  async kit(id: number) {
    const kit = await this.prisma.kit.findFirst({
      where: { id, isActive: true, club: visibleClub },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            league: true,
            season: true,
            code: true,
            markColor: true,
            kits: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: { id: true, label: true, bgColor: true, textColor: true },
            },
          },
        },
      },
    });
    if (!kit) throw new NotFoundException('Forma topilmadi');
    const { kits: siblings, ...club } = kit.club;
    return {
      ...toKitProduct(kit),
      club,
      siblings,
      sizeGroups: { adult: ADULT_SIZES, kids: KID_SIZES },
    };
  }

  // ---- Sevimli klublar ----

  async favorites(userId: number) {
    const rows = await this.prisma.favoriteClub.findMany({
      where: { userId, club: visibleClub },
      orderBy: { createdAt: 'desc' },
      select: { club: { select: clubCard } },
    });
    return rows.map((r) => toClubCard(r.club));
  }

  async addFavorite(userId: number, clubId: number) {
    const club = await this.prisma.club.findFirst({ where: { id: clubId, ...visibleClub }, select: { id: true } });
    if (!club) throw new NotFoundException('Klub topilmadi');
    await this.prisma.favoriteClub.upsert({
      where: { userId_clubId: { userId, clubId } },
      create: { userId, clubId },
      update: {},
    });
    return { clubId, isFavorite: true };
  }

  async removeFavorite(userId: number, clubId: number) {
    await this.prisma.favoriteClub.deleteMany({ where: { userId, clubId } });
    return { clubId, isFavorite: false };
  }
}
