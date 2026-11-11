import { CatalogService, toKitProduct } from './catalog.service';

// Mobil "Klub formasi" mahsulotni shu javoblardan yig'adi — kit360Id har birida bo'lishi kerak
describe('CatalogService — kit360Id javobda', () => {
  const row = { id: 14, name: 'Real Madrid', league: 'LaLiga', season: '2026/27', code: 'RM', markColor: '#1b2450', kit360Id: 'rm' };
  const prisma = {
    club: {
      findMany: jest.fn(async () => [{ ...row, category: null, _count: { kits: 1, orders: 0 } }]),
      count: jest.fn(async () => 1),
      findFirst: jest.fn(async () => ({ ...row, category: null, kits: [], createdAt: new Date(), updatedAt: new Date(), isActive: true })),
    },
    kit: { findFirst: jest.fn(async () => ({ id: 1, clubId: 14, label: 'Uy', sizes: ['L'], shirtPrice: 1, shortsPrice: 1, printPrice: 1, club: { ...row, kits: [] } })) },
    favoriteClub: { findMany: jest.fn(async () => [{ club: { ...row, category: null, _count: { kits: 1 } } }]) },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const catalog = new CatalogService(prisma as never);

  it("ro'yxat, mashhur va sevimli klublar select'ida kit360Id bor", async () => {
    expect((await catalog.clubs({})).items[0].kit360Id).toBe('rm');
    expect((await catalog.popular()).at(0)?.kit360Id).toBe('rm');
    expect((await catalog.favorites(1))[0].kit360Id).toBe('rm');
    for (const call of prisma.club.findMany.mock.calls as unknown as [{ select: Record<string, unknown> }][]) {
      expect(call[0].select.kit360Id).toBe(true);
    }
  });

  it("klub sahifasi va forma tafsilotidagi klub — kit360Id bilan", async () => {
    expect((await catalog.club(14)).kit360Id).toBe('rm');
    const kit = await catalog.kit(1);
    expect(kit.club.kit360Id).toBe('rm');
    const select = (prisma.kit.findFirst.mock.calls[0] as unknown as [{ include: { club: { select: Record<string, unknown> } } }])[0];
    expect(select.include.club.select.kit360Id).toBe(true);
  });
});

// Mobil katalog faqat Forma 360° suratlari bor klublarni ko'rsatadi (?kit360=true)
describe('CatalogService — kit360 filtri', () => {
  const prisma = {
    club: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    category: { findMany: jest.fn(async () => [{ id: 1, name: 'LaLiga', slug: 'laliga', _count: { clubs: 2 } }]) },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const catalog = new CatalogService(prisma as never);
  const lastWhere = (fn: jest.Mock) => JSON.stringify((fn.mock.calls.at(-1) as unknown as [{ where: unknown }])[0].where);

  beforeEach(() => jest.clearAllMocks());

  it("kit360=true — ro'yxat va sanoqda kit360Id: { not: null }", async () => {
    await catalog.clubs({ kit360: true });
    expect(lastWhere(prisma.club.findMany)).toContain('"kit360Id":{"not":null}');
    expect(JSON.stringify((prisma.club.count.mock.calls.at(-1) as unknown as [unknown])[0])).toContain('"kit360Id":{"not":null}');
  });

  it("filtrsiz — barcha ko'rinadigan klublar (admin/eski ilova)", async () => {
    await catalog.clubs({});
    expect(lastWhere(prisma.club.findMany)).not.toContain('kit360Id');
  });

  it('mashhur klublar ham filtrlanadi', async () => {
    await catalog.popular(8, true);
    expect(lastWhere(prisma.club.findMany)).toContain('"kit360Id":{"not":null}');
    await catalog.popular(8);
    expect(lastWhere(prisma.club.findMany)).not.toContain('kit360Id');
  });

  it("kategoriyalar: kit360 — faqat 360° klubi bor ligalar, sanoq ham shular bo'yicha", async () => {
    const rows = await catalog.categories(true);
    const args = (prisma.category.findMany.mock.calls.at(-1) as unknown as [Record<string, unknown>])[0];
    expect(JSON.stringify(args.where)).toContain('"some":{"isActive":true,"kit360Id":{"not":null}}');
    expect(JSON.stringify(args.select)).toContain('"kit360Id":{"not":null}');
    expect(rows[0].clubsCount).toBe(2);
    await catalog.categories();
    expect(JSON.stringify(prisma.category.findMany.mock.calls.at(-1))).not.toContain('kit360Id');
  });
});

// Mahsulot javobida har bir o'lchamning o'z narxi — Superadmin "Formalar"dagi sizePrices
describe("toKitProduct — o'lcham bo'yicha narx", () => {
  const kit = {
    id: 1,
    clubId: 1,
    label: 'Uy',
    bgColor: '#0e1a3f',
    textColor: '#ffffff',
    sortOrder: 0,
    colorsLabel: null,
    description: null,
    shirtPrice: 159000,
    shortsPrice: 0,
    printPrice: 30000,
    sizePrices: { XXL: 170000, '3XL': 180000 },
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    sleeve: 'SHORT',
    bottom: 'SHORTS',
    isActive: true,
  } as unknown as Parameters<typeof toKitProduct>[0];

  it("sizePrices'da bor o'lcham — o'z narxi, bo'lmasa shirtPrice", () => {
    const bySize = Object.fromEntries(toKitProduct(kit).sizes.map((s) => [s.size, s.price]));
    expect(bySize.XXL).toBe(170000);
    expect(bySize['3XL']).toBe(180000);
    expect(bySize.S).toBe(159000);
    expect(bySize.M).toBe(159000);
  });
});
