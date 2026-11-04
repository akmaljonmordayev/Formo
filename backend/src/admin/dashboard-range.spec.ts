import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService, resolveRange } from './orders.service';

describe('Dashboard davri (resolveRange)', () => {
  it('from/to — ikkala chekka kun ham kiradi', () => {
    const r = resolveRange({ from: '2026-10-30', to: '2026-11-02' });
    expect(r.dayKeys).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(r.from.toISOString()).toBe('2026-10-30T00:00:00.000Z');
    expect(r.to?.toISOString()).toBe('2026-11-02T23:59:59.999Z');
  });

  it('days — oxirgi N kun, bugun bilan tugaydi', () => {
    const r = resolveRange({ days: 7 });
    expect(r.dayKeys).toHaveLength(7);
    expect(r.dayKeys[6]).toBe(new Date().toISOString().slice(0, 10));
    expect(r.to).toBeUndefined();
  });

  it.each([
    [{ from: '2026-11-01' }],
    [{ from: '2026-11-05', to: '2026-11-01' }],
    [{ from: '2026-02-31', to: '2026-03-05' }],
    [{ from: '2024-01-01', to: '2026-01-01' }],
  ])("noto'g'ri davr rad etiladi: %o", (range) => {
    expect(() => resolveRange(range)).toThrow(BadRequestException);
  });
});

describe('dashboardStats — kunlik tushum', () => {
  const prisma = {
    order: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    user: { aggregate: jest.fn().mockResolvedValue({ _sum: { dailyCapacity: 0 } }) },
  };
  const service = new OrdersService(prisma as unknown as PrismaService, {} as never, {} as never, {} as never);

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
      gte: new Date('2026-11-01T00:00:00.000Z'),
      lte: new Date('2026-11-02T23:59:59.999Z'),
    });
  });
});
