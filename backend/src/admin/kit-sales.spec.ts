import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';

const item = (over: object) => ({ kitId: 1, kitDesignId: null, clubName: 'Real Madrid', kitLabel: 'Uy', shirtSize: 'M', quantity: 1, totalPrice: 100, ...over });

describe('OrdersService.kitSales', () => {
  const findMany = jest.fn();
  const service = new OrdersService({ orderItem: { findMany } } as never, {} as never, {} as never, {} as never, {} as never);

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([
      item({ quantity: 2, totalPrice: 200 }),
      item({ shirtSize: 'L', quantity: 3, totalPrice: 300 }),
      item({ kitId: 2, clubName: 'Barcelona', shirtSize: 'L' }),
      item({ kitId: null, clubName: '', kitLabel: '', shirtSize: 'XL' }),
    ]);
  });

  it("superadmin: forma va o'lcham bo'yicha yig'adi, ko'p sotilgani birinchi, summa bilan", async () => {
    const res = await service.kitSales({ days: 30 }, { id: 1, role: Role.SUPERADMIN } as never);
    expect(res.totalQuantity).toBe(7);
    expect(res.totalRevenue).toBe(700);
    expect(res.kits[0]).toEqual({ name: 'Real Madrid · Uy', type: 'CLUB_KIT', quantity: 5, revenue: 500, sizes: { M: 2, L: 3 } });
    expect(res.kits.map((k) => k.type)).toEqual(['CLUB_KIT', 'CLUB_KIT', 'CUSTOM_DESIGN']);
    expect(res.sizes).toEqual([{ size: 'L', quantity: 4 }, { size: 'M', quantity: 2 }, { size: 'XL', quantity: 1 }]);
    expect(findMany.mock.calls[0][0].where.order.workshopId).toBeUndefined();
  });

  it("tikuv sexi: faqat o'z buyurtmalari, summasiz", async () => {
    const res = await service.kitSales({ days: 7 }, { id: 42, role: Role.TAILOR } as never);
    expect(findMany.mock.calls[0][0].where.order.workshopId).toBe(42);
    expect(res.totalRevenue).toBeNull();
    expect(res.kits.every((k) => k.revenue === null)).toBe(true);
  });
});
