/**
 * Lokal (dev) bazaga haqiqiy katalogni ochiq API'dan ko'chiradi: kategoriyalar → klublar → formalar.
 *
 *   pnpm catalog:import                       # manba: https://api.formo.uz/api
 *   pnpm catalog:import -- --source=<url>/api
 *
 * Faqat yo'q yozuvlar qo'shiladi (kategoriya — slug, klub — nom+mavsum, forma — klub+label bo'yicha);
 * mavjud yozuvlar o'zgartirilmaydi va hech narsa o'chirilmaydi. Manba faqat o'qiladi (ochiq GET).
 * Xavfsizlik: NODE_ENV=production yoki localhost bo'lmagan DATABASE_URL bilan ishlamaydi (--allow-remote).
 */
import { ClubType, Continent, PrismaClient } from '@prisma/client';
import { kit360IdFor } from '../src/kits/kit360';

interface SourceCategory {
  id: number;
  name: string;
  slug: string;
}
interface SourceKit {
  label: string;
  bgColor: string;
  textColor: string;
  colorsLabel: string | null;
  description: string | null;
  priceBreakdown: { shirt: number; shorts: number; print: number };
  sizes: { size: string; available: boolean }[];
}
interface SourceClub {
  id: number;
  name: string;
  league: string;
  season: string;
  code: string;
  markColor: string;
  type?: ClubType;
  continent?: Continent | null;
  category: SourceCategory | null;
  kits?: SourceKit[];
}

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const source = (arg('source') ?? 'https://api.formo.uz/api').replace(/\/+$/, '');

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${source}${path}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function assertSafeTarget() {
  if (process.env.NODE_ENV === 'production') throw new Error('NODE_ENV=production — import qilinmaydi');
  const url = process.env.DATABASE_URL ?? '';
  const host = /@([^:/?]+)/.exec(url)?.[1] ?? '';
  if (!['localhost', '127.0.0.1', '::1'].includes(host) && !process.argv.includes('--allow-remote')) {
    throw new Error(`DATABASE_URL lokal emas (${host || 'noma’lum'}) — ishonchingiz komil bo'lsa --allow-remote qo'shing`);
  }
}

async function freeKit360(prisma: PrismaClient, id: string | null) {
  if (!id) return null;
  return (await prisma.club.findUnique({ where: { kit360Id: id }, select: { id: true } })) ? null : id;
}

async function main() {
  assertSafeTarget();
  const prisma = new PrismaClient();
  const stats = { categories: 0, clubs: 0, kits: 0, skipped: 0 };
  try {
    const categories = await get<SourceCategory[]>('/catalog/categories');
    const categoryIds = new Map<number, number>();
    for (const [i, c] of categories.entries()) {
      const existing = await prisma.category.findFirst({ where: { OR: [{ slug: c.slug }, { name: c.name }] } });
      const row = existing ?? (await prisma.category.create({ data: { name: c.name, slug: c.slug, sortOrder: i } }));
      if (existing) stats.skipped++;
      else stats.categories++;
      categoryIds.set(c.id, row.id);
    }

    const clubs: SourceClub[] = [];
    for (let page = 1; ; page++) {
      const res = await get<{ items: SourceClub[]; total: number }>(`/catalog/clubs?limit=100&page=${page}`);
      clubs.push(...res.items);
      if (!res.items.length || clubs.length >= res.total) break;
    }

    for (const card of clubs) {
      const club = await get<SourceClub>(`/catalog/clubs/${card.id}`);
      const categoryId = club.category ? categoryIds.get(club.category.id) ?? null : null;
      let local = await prisma.club.findUnique({ where: { name_season: { name: club.name, season: club.season } } });
      if (local) {
        stats.skipped++;
      } else {
        local = await prisma.club.create({
          data: {
            name: club.name,
            league: club.league,
            season: club.season,
            code: club.code,
            markColor: club.markColor,
            categoryId,
            type: club.type ?? ClubType.CLUB,
            continent: club.continent ?? null,
            // Forma 360° suratlari bor bo'lsa — darhol bog'lanadi (id band bo'lsa — keyin kit360:backfill hal qiladi)
            kit360Id: await freeKit360(prisma, kit360IdFor(club.name, club.code)),
          },
        });
        stats.clubs++;
      }

      for (const [i, kit] of (club.kits ?? []).entries()) {
        const exists = await prisma.kit.findFirst({ where: { clubId: local.id, label: kit.label } });
        if (exists) {
          stats.skipped++;
          continue;
        }
        await prisma.kit.create({
          data: {
            clubId: local.id,
            label: kit.label,
            bgColor: kit.bgColor,
            textColor: kit.textColor,
            colorsLabel: kit.colorsLabel,
            description: kit.description,
            shirtPrice: kit.priceBreakdown.shirt,
            shortsPrice: kit.priceBreakdown.shorts,
            printPrice: kit.priceBreakdown.print,
            sizes: kit.sizes.filter((s) => s.available).map((s) => s.size),
            sortOrder: i,
          },
        });
        stats.kits++;
      }
    }
    console.log(
      `Manba: ${source}\nQo'shildi: ${stats.categories} kategoriya, ${stats.clubs} klub, ${stats.kits} forma. ` +
        `Allaqachon bor (o'zgartirilmadi): ${stats.skipped}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
