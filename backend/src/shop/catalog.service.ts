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
  // Forma 360° suratlari to'plami (es, rm, mu ...) — mobil "Klub formasi" 3D o'rniga foto-360° ko'rsatadi
  kit360Id: true,
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { kits: { where: { isActive: true } } } },
} satisfies Prisma.ClubSelect;

/** Forma 360° suratlari bor klublar (mobil katalog: ?kit360=true) */
const withKit360: Prisma.ClubWhereInput = { kit360Id: { not: null } };

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

/** Forma kartasi: mahsulot + klub (Forma 360° surati uchun kit360Id) */
const kitCardInclude = {
  club: {
    select: {
      id: true,
      name: true,
      code: true,
      league: true,
      markColor: true,
      kit360Id: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.KitInclude;

type KitCardRow = Prisma.KitGetPayload<{ include: typeof kitCardInclude }>;

const toKitCard = (kit: KitCardRow, soldCount = 0) => ({ ...toKitProduct(kit), club: kit.club, soldCount });

/** Sotilgan deb hisoblanmaydigan buyurtmalar: bekor qilingan, qaytarilgan, to'lanmagan */
const NOT_SOLD: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.RETURNED, OrderStatus.PENDING_PAYMENT];

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Katalogdagi filtr chiplari (Barchasi, LaLiga, Premier League ...) */
  async categories(kit360 = false) {
    const clubs: Prisma.ClubWhereInput = kit360 ? { isActive: true, ...withKit360 } : { isActive: true };
    const rows = await this.prisma.category.findMany({
      // kit360 — faqat 360° klubi bor ligalar (bo'sh chip ko'rinmasin)
      where: kit360 ? { isActive: true, clubs: { some: clubs } } : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { clubs: { where: clubs } } },
      },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, clubsCount: _count.clubs }));
  }

  async clubs(query: ListCatalogClubsQueryDto) {
    const { categoryId, category, search, kit360, page = 1, limit = 50 } = query;
    const where: Prisma.ClubWhereInput = { AND: [visibleClub] };
    const and = where.AND as Prisma.ClubWhereInput[];
    if (kit360) and.push(withKit360);
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
  async popular(limit = 8, kit360 = false) {
    const clubs = await this.prisma.club.findMany({
      where: kit360 ? { AND: [visibleClub, withKit360] } : visibleClub,
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
            kit360Id: true,
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

  // ---- Formalar: eng ko'p sotilganlari va sevimlilar (yurakcha) ----

  /**
   * Formalar sotilgan soni bo'yicha (ko'pidan kamiga): buyurtmalardagi qatorlar miqdori yig'indisi,
   * bekor qilingan/qaytarilgan/to'lanmaganlar sanalmaydi. Teng bo'lsa — klub nomi bo'yicha.
   * kit360=true — har klubdan bitta (birinchi) forma: Forma 360° ekrani buyurtmada shuni ishlatadi
   * va jamoa surati katalogda takrorlanmaydi.
   */
  async bestSellingKits(limit = 20, kit360 = false) {
    const rows = await this.prisma.kit.findMany({
      where: { isActive: true, club: kit360 ? { AND: [visibleClub, withKit360] } : visibleClub },
      include: kitCardInclude,
      orderBy: [{ club: { name: 'asc' } }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
    const seen = new Set<number>();
    const kits = kit360 ? rows.filter((k) => !seen.has(k.clubId) && seen.add(k.clubId)) : rows;
    if (!kits.length) return [];

    const sold = await this.prisma.orderItem.groupBy({
      by: ['kitId'],
      where: { kitId: { in: kits.map((k) => k.id) }, order: { status: { notIn: NOT_SOLD } } },
      _sum: { quantity: true },
    });
    const soldBy = new Map(sold.map((s) => [s.kitId, s._sum.quantity ?? 0]));
    // Array.sort barqaror — teng sotuvda nom bo'yicha tartib saqlanadi
    return kits
      .map((k) => toKitCard(k, soldBy.get(k.id) ?? 0))
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, limit);
  }

  async favoriteKits(userId: number) {
    const rows = await this.prisma.favoriteKit.findMany({
      where: { userId, kit: { isActive: true, club: visibleClub } },
      orderBy: { createdAt: 'desc' },
      select: { kit: { include: kitCardInclude } },
    });
    return rows.map((r) => toKitCard(r.kit));
  }

  async addFavoriteKit(userId: number, kitId: number) {
    const kit = await this.prisma.kit.findFirst({ where: { id: kitId, isActive: true, club: visibleClub }, select: { id: true } });
    if (!kit) throw new NotFoundException('Forma topilmadi');
    await this.prisma.favoriteKit.upsert({
      where: { userId_kitId: { userId, kitId } },
      create: { userId, kitId },
      update: {},
    });
    return { kitId, isFavorite: true };
  }

  async removeFavoriteKit(userId: number, kitId: number) {
    await this.prisma.favoriteKit.deleteMany({ where: { userId, kitId } });
    return { kitId, isFavorite: false };
  }
}
