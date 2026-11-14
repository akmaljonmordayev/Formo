import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService, resolveRange, tashkentDayKey } from './orders.service';

describe('Dashboard davri (resolveRange)', () => {
  it('from/to — ikkala chekka kun ham kiradi', () => {
    const r = resolveRange({ from: '2026-10-30', to: '2026-11-02' });
    expect(r.dayKeys).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    // Toshkent kuni: 00:00 (UTC+5) = oldingi kun 19:00 UTC
    expect(r.from.toISOString()).toBe('2026-10-29T19:00:00.000Z');
    expect(r.to?.toISOString()).toBe('2026-11-02T18:59:59.999Z');
  });

  it('days — oxirgi N kun, bugun bilan tugaydi; from birinchi kunning 00:00 i (grafik bilan bir xil chegara)', () => {
    for (const days of [1, 7, 30]) {
      const r = resolveRange({ days });
      expect(r.dayKeys).toHaveLength(days);
      expect(r.dayKeys[days - 1]).toBe(tashkentDayKey(new Date()));
      expect(tashkentDayKey(r.from)).toBe(r.dayKeys[0]);
      expect(r.from.getUTCHours()).toBe(19);
      expect(r.to).toBeUndefined();
    }
  });

  it('all — birinchi buyurtma kunidan bugungacha; buyurtma yo\'q bo\'lsa faqat bugun', () => {
    const today = tashkentDayKey(new Date());
    const first = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000);
    const r = resolveRange({ all: true }, first);
    expect(tashkentDayKey(r.from)).toBe(tashkentDayKey(first));
    expect(r.dayKeys[0]).toBe(tashkentDayKey(first));
    expect(r.dayKeys.at(-1)).toBe(today);
    expect(tashkentDayKey(r.to!)).toBe(today);
    expect(r.to?.getUTCHours()).toBe(18);
    expect(resolveRange({ all: true }, null).dayKeys).toEqual([today]);
  });

  it('uzun davr (2 yil) ham qabul qilinadi', () => {
    expect(resolveRange({ from: '2024-01-01', to: '2026-01-01' }).dayKeys).toHaveLength(732);
  });

  it.each([
    [{ from: '2026-11-01' }],
    [{ from: '2026-11-05', to: '2026-11-01' }],
    [{ from: '2026-02-31', to: '2026-03-05' }],
    [{ from: '2010-01-01', to: '2026-01-01' }],
  ])("noto'g'ri davr rad etiladi: %o", (range) => {
    expect(() => resolveRange(range)).toThrow(BadRequestException);
  });
});

describe('dashboardStats — kunlik tushum', () => {
  const prisma = {
    order: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    user: { aggregate: jest.fn().mockResolvedValue({ _sum: { dailyCapacity: 0 } }) },
  };
  const service = new OrdersService(prisma as unknown as PrismaService, {} as never, {} as never, {} as never, {} as never);

  it('har kunga count va revenue; bekor qilingan hisoblanmaydi', async () => {
    const at = (d: string) => new Date(`${d}T10:00:00.000Z`);
    prisma.order.findMany
      .mockResolvedValueOnce([
        { totalSum: 100, status: OrderStatus.DELIVERED, createdAt: at('2026-11-01') },
        { totalSum: 50, status: OrderStatus.CANCELLED, createdAt: at('2026-11-01') },
        { totalSum: 70, status: OrderStatus.DELIVERED, createdAt: at('2026-11-02') },
      ])
      .mockResolvedValueOnce([]);
    const stats = await service.dashboardStats({ from: '2026-11-01', to: '2026-11-02' });
    expect(stats.dailyTrend).toEqual([
      { date: '2026-11-01', count: 1, revenue: 100 },
      { date: '2026-11-02', count: 1, revenue: 70 },
    ]);
    expect(prisma.order.findMany.mock.calls[0][0].where.createdAt).toEqual({
      gte: new Date('2026-10-31T19:00:00.000Z'),
      lte: new Date('2026-11-02T18:59:59.999Z'),
    });
  });

  it('tungi buyurtma (02:00 Toshkent = 21:00 UTC kechagi) o‘z Toshkent kuniga tushadi', async () => {
    prisma.order.findMany
      .mockResolvedValueOnce([{ totalSum: 90, status: OrderStatus.DELIVERED, createdAt: new Date('2026-11-01T21:00:00.000Z') }])
      .mockResolvedValueOnce([]);
    const stats = await service.dashboardStats({ from: '2026-11-01', to: '2026-11-02' });
    expect(stats.dailyTrend).toEqual([
      { date: '2026-11-01', count: 0, revenue: 0 },
      { date: '2026-11-02', count: 1, revenue: 90 },
    ]);
  });

  it("butun davr: birinchi buyurtmadan bugungacha, ordersCount va revenue grafik yig'indisiga teng, delta — null", async () => {
    const day = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    const orders = [
      { totalSum: 100, status: OrderStatus.DELIVERED, createdAt: day(10) },
      { totalSum: 40, status: OrderStatus.NEW, createdAt: day(3) },
      { totalSum: 50, status: OrderStatus.CANCELLED, createdAt: day(3) },
      { totalSum: 70, status: OrderStatus.DELIVERED, createdAt: day(0) },
    ];
    prisma.order.findMany.mockReset().mockResolvedValueOnce(orders);
    const findFirst = jest.fn().mockResolvedValue({ createdAt: orders[0].createdAt });
    Object.assign(prisma.order, { findFirst });

    const stats = await service.dashboardStats({ all: true });
    expect(findFirst).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
    expect(stats.dailyTrend).toHaveLength(11);
    expect(stats.dailyTrend.reduce((s, d) => s + d.count, 0)).toBe(stats.ordersCount);
    expect(stats.dailyTrend.reduce((s, d) => s + d.revenue, 0)).toBe(stats.revenue);
    expect(stats).toMatchObject({ ordersCount: 3, ordersDeltaPct: null, revenueDeltaPct: null });
    expect(prisma.order.findMany).toHaveBeenCalledTimes(1); // oldingi davr so'ralmaydi
  });
});
