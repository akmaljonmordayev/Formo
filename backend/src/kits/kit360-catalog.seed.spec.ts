import { Kit360CatalogSeed } from './kit360-catalog.seed';
import { KIT360_CATALOG } from './kit360';
const REVEAL = 'kit360.catalog.revealed.v1';

interface Category {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
}

interface Club {
  id: number;
  name: string;
  code: string;
  season: string;
  isActive: boolean;
  kit360Id: string | null;
  categoryId: number | null;
  activeKits: number;
}

/** Seed ishlatadigan Prisma so'rovlarining xotiradagi nusxasi */
function fakePrisma(clubs: Club[], categories: Category[]) {
  const settings = new Map<string, unknown>();
  let nextId = 1000;
  const prisma = {
    club: {
      findMany: async () => clubs.map((c) => ({ ...c })),
      findUnique: async ({ where }: { where: { kit360Id?: string; name_season?: { name: string; season: string } } }) => {
        const club = clubs.find((c) =>
          where.kit360Id ? c.kit360Id === where.kit360Id : c.name === where.name_season?.name && c.season === where.name_season?.season,
        );
        if (!club) return null;
        return {
          ...club,
          category: categories.find((c) => c.id === club.categoryId) ?? null,
          kits: Array.from({ length: club.activeKits }, (_, id) => ({ id })),
        };
      },
      update: async ({ where, data }: { where: { id: number }; data: Partial<Club> }) => Object.assign(clubs.find((c) => c.id === where.id)!, data),
      create: async ({ data }: { data: { name: string; code: string; season: string; categoryId: number; kit360Id: string } }) => {
        const club = { ...data, id: ++nextId, isActive: true, activeKits: 1 };
        clubs.push(club);
        return club;
      },
    },
    kit: {
      create: async ({ data }: { data: { clubId: number } }) => {
        clubs.find((c) => c.id === data.clubId)!.activeKits += 1;
      },
    },
    category: {
      findFirst: async ({ where }: { where: { OR: [{ slug: string }, { name: string }] } }) =>
        categories.find((c) => c.slug === where.OR[0].slug || c.name === where.OR[1].name) ?? null,
      create: async ({ data }: { data: { name: string; slug: string } }) => {
        if (categories.some((c) => c.name === data.name || c.slug === data.slug)) throw new Error('P2002');
        const category = { ...data, id: ++nextId, isActive: true };
        categories.push(category);
        return category;
      },
      update: async ({ where, data }: { where: { id: number }; data: Partial<Category> }) =>
        Object.assign(categories.find((c) => c.id === where.id)!, data),
    },
    setting: {
      findUnique: async ({ where }: { where: { key: string } }) => (settings.has(where.key) ? { key: where.key } : null),
      upsert: async ({ where, create }: { where: { key: string }; create: { value: unknown } }) => settings.set(where.key, create.value),
    },
  };
  return { prisma, settings };
}

const seedFor = (prisma: unknown) => {
  const seed = new Kit360CatalogSeed(prisma as ConstructorParameters<typeof Kit360CatalogSeed>[0]);
  (seed as unknown as { logger: Record<string, jest.Mock> }).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return seed;
};

/** Mijoz katalogidagi visibleClub + kit360=true sharti */
const visibleIds = (clubs: Club[], categories: Category[]) =>
  clubs
    .filter((c) => c.kit360Id && c.isActive && c.activeKits > 0)
    .filter((c) => c.categoryId === null || categories.find((k) => k.id === c.categoryId)?.isActive)
    .map((c) => c.kit360Id)
    .sort();

const allIds = () => KIT360_CATALOG.map((t) => t.id as string).sort();

const club = (id: number, name: string, over: Partial<Club> = {}): Club => ({
  id,
  name,
  code: name.slice(0, 2).toUpperCase(),
  season: '2026/27',
  isActive: true,
  kit360Id: null,
  categoryId: null,
  activeKits: 1,
  ...over,
});

describe('Kit360CatalogSeed', () => {
  it("bo'sh katalog: 18 jamoaning hammasi mijozga ko'rinadi", async () => {
    const clubs: Club[] = [];
    const categories: Category[] = [];
    await seedFor(fakePrisma(clubs, categories).prisma).run();
    expect(visibleIds(clubs, categories)).toEqual(allIds());
  });

  it('nofaol klublar va nofaol kategoriyalar bir marta ochiladi (prod holati)', async () => {
    const categories: Category[] = [
      { id: 1, name: 'LaLiga', slug: 'laliga', isActive: false },
      { id: 2, name: 'Amerika terma jamoalari', slug: 'amerika-terma-jamoalari', isActive: true },
    ];
    const clubs = [
      club(1, 'Real Madrid', { kit360Id: 'rm', isActive: false, categoryId: 1 }),
      club(2, 'Barselona', { categoryId: 1, isActive: false, activeKits: 0 }), // hali bog'lanmagan va formasiz
      club(3, 'Argentina', { kit360Id: 'ar', categoryId: 2 }),
    ];
    await seedFor(fakePrisma(clubs, categories).prisma).run();
    expect(visibleIds(clubs, categories)).toEqual(allIds());
  });

  it('bir martalik: keyin admin yashirgan klub qayta ochilmaydi', async () => {
    const clubs: Club[] = [];
    const categories: Category[] = [];
    const { prisma, settings } = fakePrisma(clubs, categories);
    await seedFor(prisma).run();
    expect(settings.has(REVEAL)).toBe(true);

    clubs.find((c) => c.kit360Id === 'rm')!.isActive = false;
    await seedFor(prisma).run();
    expect(clubs.find((c) => c.kit360Id === 'rm')!.isActive).toBe(false);
  });

  it('kategoriya nomi band, slug boshqacha: seed yiqilmaydi va bor kategoriyani ishlatadi', async () => {
    const categories: Category[] = [{ id: 1, name: 'LaLiga', slug: 'la-liga-es', isActive: true }];
    const clubs: Club[] = [];
    await seedFor(fakePrisma(clubs, categories).prisma).run();
    expect(visibleIds(clubs, categories)).toEqual(allIds());
    expect(categories.filter((c) => c.name === 'LaLiga')).toHaveLength(1);
    expect(clubs.find((c) => c.kit360Id === 'rm')!.categoryId).toBe(1);
  });

  it("bitta jamoadagi xato qolganlarini to'xtatmaydi, belgi qo'yilmaydi va keyingi safar qayta uriniladi", async () => {
    const clubs: Club[] = [];
    const categories: Category[] = [];
    const { prisma, settings } = fakePrisma(clubs, categories);
    const create = prisma.club.create;
    prisma.club.create = async (args) => {
      if (args.data.kit360Id === 'es') throw new Error('boom');
      return create(args);
    };
    await seedFor(prisma).run();
    expect(visibleIds(clubs, categories)).toEqual(allIds().filter((id) => id !== 'es'));
    expect(settings.has(REVEAL)).toBe(false);

    prisma.club.create = create;
    await seedFor(prisma).run();
    expect(visibleIds(clubs, categories)).toEqual(allIds());
    expect(settings.has(REVEAL)).toBe(true);
  });

  it("uzun yengli forma: faqat suratlari bor jamoaga, har jamoaga bir marta, asosiy formaning narxi bilan", async () => {
    type K = { sleeve: string; label: string; shirtPrice: number; sortOrder: number; isActive: boolean };
    const short = (shirtPrice = 159000): K => ({ sleeve: 'SHORT', label: 'Uy', shirtPrice, sortOrder: 0, isActive: true });
    const kits: Record<number, K[]> = {
      1: [short(200000)],
      2: [short()],
      3: [short(), { sleeve: 'LONG', label: 'Uy', shirtPrice: 189000, sortOrder: 1, isActive: true }],
      // Admin yashirgan (nofaol) uzun yengli forma — qayta yaratilmaydi
      4: [short(), { sleeve: 'LONG', label: 'Uy', shirtPrice: 189000, sortOrder: 1, isActive: false }],
    };
    const linked: Record<string, number> = { rm: 1, ars: 2, fcb: 3, mu: 4 };
    const created: { clubId: number; sleeve: string; bottom: string; shirtPrice?: number }[] = [];
    const settings = new Map<string, unknown>();
    const prisma = {
      club: {
        findUnique: async ({ where }: { where: { kit360Id: string } }) =>
          linked[where.kit360Id] ? { id: linked[where.kit360Id], kits: kits[linked[where.kit360Id]] } : null,
      },
      kit: {
        create: async ({ data }: { data: (typeof created)[number] }) => {
          created.push(data);
          kits[data.clubId].push({ sleeve: data.sleeve, label: 'Uy', shirtPrice: 0, sortOrder: 1, isActive: true });
        },
      },
      setting: {
        findUnique: async ({ where }: { where: { key: string } }) =>
          settings.has(where.key) ? { key: where.key, value: settings.get(where.key) } : null,
        upsert: async ({ where, create }: { where: { key: string }; create: { value: unknown } }) => settings.set(where.key, create.value),
      },
    };
    await seedFor(prisma).ensureLongKits();
    // rm — qo'shildi (narxi asosiy formadan); ars — uzun yeng suratlari yo'q; fcb — bor; mu — nofaol bo'lsa ham bor
    expect(created).toEqual([expect.objectContaining({ clubId: 1, sleeve: 'LONG', bottom: 'PANTS', shirtPrice: 200000 })]);

    // Admin rm uzun yengli formasini o'chirdi — qayta yaratilmaydi
    kits[1] = [short(200000)];
    await seedFor(prisma).ensureLongKits();
    expect(created).toHaveLength(1);

    // Klubi birinchi ishga tushishda hali yo'q edi (es) — keyingisida qo'shiladi
    linked.es = 5;
    kits[5] = [short()];
    await seedFor(prisma).ensureLongKits();
    expect(created.map((c) => c.clubId)).toEqual([1, 5]);
  });
});
