import { CatalogService } from './catalog.service';

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
