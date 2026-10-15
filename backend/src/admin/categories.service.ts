import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

/** "Premier League" -> "premier-league" (migratsiyadagi SQL bilan bir xil qoida) */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { clubs: true } } },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, clubsCount: _count.clubs }));
  }

  private slugFor(name: string, slug?: string) {
    const value = slug ?? slugify(name);
    if (!value) throw new BadRequestException("Nomdan slug yasab bo'lmadi — slug'ni o'zingiz bering");
    return value;
  }

  async create(dto: CreateCategoryDto, actor: AuditEntry['actor'], ip?: string) {
    const slug = this.slugFor(dto.name, dto.slug);
    const exists = await this.prisma.category.findFirst({
      where: { OR: [{ name: { equals: dto.name, mode: 'insensitive' } }, { slug }] },
    });
    if (exists) throw new ConflictException('Bunday kategoriya allaqachon mavjud');

    const category = await this.prisma.category.create({ data: { ...dto, slug } });
    await this.audit.log({ actor, action: "Kategoriya qo'shildi", category: AuditCategory.CATALOG, context: category.name, ip });
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto, actor: AuditEntry['actor'], ip?: string) {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Kategoriya topilmadi');

    const category = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({ where: { id }, data: dto });
      // Klublardagi "league" matni kategoriya nomi bilan bir xil turadi (eski panel shu maydonni ko'rsatadi)
      if (dto.name && dto.name !== current.name) {
        await tx.club.updateMany({ where: { categoryId: id }, data: { league: dto.name } });
      }
      return updated;
    });

    await this.audit.log({ actor, action: 'Kategoriya tahrirlandi', category: AuditCategory.CATALOG, context: category.name, ip });
    return category;
  }

  async remove(id: number, actor: AuditEntry['actor'], ip?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { clubs: true } } },
    });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
    if (category._count.clubs) {
      throw new ConflictException(`Kategoriyada ${category._count.clubs} ta klub bor — avval ularni boshqa kategoriyaga o'tkazing`);
    }
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log({ actor, action: "Kategoriya o'chirildi", category: AuditCategory.CATALOG, context: category.name, ip });
    return { message: "Kategoriya o'chirildi" };
  }

  /** Klub uchun kategoriya: id bo'yicha, yoki "league" nomi bo'yicha (yo'q bo'lsa yaratiladi) */
  async resolve(db: Db, input: { categoryId?: number; league?: string }) {
    if (input.categoryId) {
      const category = await db.category.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new BadRequestException('Kategoriya topilmadi');
      return category;
    }
    if (!input.league) return null;
    const existing = await db.category.findFirst({ where: { name: { equals: input.league, mode: 'insensitive' } } });
    if (existing) return existing;
    const slug = slugify(input.league);
    if (!slug) return null;
    return db.category.upsert({ where: { slug }, create: { name: input.league, slug }, update: {} });
  }
}
