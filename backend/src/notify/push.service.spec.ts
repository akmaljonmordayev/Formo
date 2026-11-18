import { OrderStatus } from '@prisma/client';
import { asPushLang, pushText } from './push-texts';
import { isExpoPushToken, PushService } from './push.service';

const TOKEN = 'ExponentPushToken[abc123]';

describe('push-texts', () => {
  it('noma’lum til o‘zbekchaga tushadi', () => {
    expect(asPushLang('uzc')).toBe('uzc');
    expect(asPushLang('de')).toBe('uz');
    expect(asPushLang(null)).toBe('uz');
  });

  it('holat xabari tanlangan tilda; NEW va to‘lov kutish — xabarsiz', () => {
    expect(pushText('uz', OrderStatus.SENT_TO_WORKSHOP, 'FRM-1')?.title).toBe('Buyurtmangiz qabul qilindi ✅');
    expect(pushText('ru', OrderStatus.DELIVERED, 'FRM-1')?.title).toBe('Вы получили заказ?');
    expect(pushText('uzc', OrderStatus.DELIVERING, 'FRM-1')?.body).toContain('FRM-1');
    expect(pushText('uz', OrderStatus.NEW, 'FRM-1')).toBeNull();
    expect(pushText('en', OrderStatus.PENDING_PAYMENT, 'FRM-1')).toBeNull();
  });

  it('Expo token formati tekshiriladi', () => {
    expect(isExpoPushToken(TOKEN)).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[x_y-z]')).toBe(true);
    expect(isExpoPushToken('random')).toBe(false);
  });
});

describe('PushService', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  const make = () => {
    const prisma = {
      pushToken: { upsert: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() },
      pushOutbox: { upsert: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      order: { findUnique: jest.fn() },
    };
    const config = { get: () => undefined };
    return { svc: new PushService(prisma as never, config as never), prisma };
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as never;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('token hisobga til bilan yoziladi (noma’lum til — uz)', async () => {
    const { svc, prisma } = make();
    await svc.register(7, TOKEN, 'xx', 'ios');
    expect(prisma.pushToken.upsert).toHaveBeenCalledWith({
      where: { token: TOKEN },
      create: { userId: 7, token: TOKEN, language: 'uz', platform: 'ios' },
      update: { userId: 7, language: 'uz', platform: 'ios' },
    });
  });

  it('holat o‘zgarishi mijozning har qurilmasi uchun o‘z tilida navbatga qo‘yiladi', async () => {
    const { svc, prisma } = make();
    prisma.order.findUnique.mockResolvedValue({ code: 'FRM-9', customerId: 3 });
    prisma.pushToken.findMany.mockResolvedValue([
      { token: 'ExponentPushToken[a]', language: 'uz' },
      { token: 'ExponentPushToken[b]', language: 'ru' },
    ]);
    await svc.enqueueOrderStatus(prisma as never, 9, OrderStatus.DELIVERED, 55);
    expect(prisma.pushOutbox.upsert).toHaveBeenCalledTimes(2);
    const [first, second] = prisma.pushOutbox.upsert.mock.calls.map((c) => c[0]);
    expect(first.create).toMatchObject({ title: 'Buyurtmangizni qabul qildingizmi?', data: { type: 'order', orderId: 9 } });
    expect(second.create.title).toBe('Вы получили заказ?');
    expect(first.where.dedupeKey).toBe('order-status:55:ExponentPushToken[a]');
  });

  it('mijozsiz buyurtma yoki xabarsiz holat — navbatga hech narsa tushmaydi', async () => {
    const { svc, prisma } = make();
    prisma.order.findUnique.mockResolvedValue({ code: 'FRM-1', customerId: null });
    await svc.enqueueOrderStatus(prisma as never, 1, OrderStatus.DELIVERED, 1);
    prisma.order.findUnique.mockResolvedValue({ code: 'FRM-1', customerId: 3 });
    prisma.pushToken.findMany.mockResolvedValue([{ token: TOKEN, language: 'uz' }]);
    await svc.enqueueOrderStatus(prisma as never, 1, OrderStatus.NEW, 2);
    expect(prisma.pushOutbox.upsert).not.toHaveBeenCalled();
  });

  it('flush: yuborilgani belgilanadi, o‘chirilgan qurilma tokeni olib tashlanadi', async () => {
    const { svc, prisma } = make();
    prisma.pushOutbox.findMany.mockResolvedValue([
      { id: 1, token: 'ExponentPushToken[ok]', title: 't', body: 'b', data: {} },
      { id: 2, token: 'ExponentPushToken[dead]', title: 't', body: 'b', data: {} },
    ]);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ status: 'ok' }, { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }],
      }),
    });
    await svc.flush();
    expect(prisma.pushOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ sentAt: expect.any(Date) }) }));
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({ where: { token: 'ExponentPushToken[dead]' } });
    expect(prisma.pushOutbox.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { attempts: 5, lastError: 'gone' } });
  });

  it('flush: Expo javob bermasa xabar qayta urinish uchun qoladi, xato tashqariga chiqmaydi', async () => {
    const { svc, prisma } = make();
    prisma.pushOutbox.findMany.mockResolvedValue([{ id: 3, token: TOKEN, title: 't', body: 'b', data: null }]);
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(svc.flush()).resolves.toBeUndefined();
    expect(prisma.pushOutbox.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { attempts: { increment: 1 }, lastError: 'Expo javob bermadi' },
    });
    expect(prisma.pushToken.deleteMany).not.toHaveBeenCalled();
  });
});
