import { NotifyService } from './notify.service';

describe('NotifyService', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  const make = (opts: { token?: string; settings?: Record<string, unknown> | null; late?: { id: number; code: string }[] }) => {
    const prisma = {
      setting: { findUnique: jest.fn().mockResolvedValue(opts.settings ? { value: opts.settings } : null) },
      order: { findMany: jest.fn().mockResolvedValue(opts.late ?? []) },
    };
    const config = { get: (k: string) => (k === 'TELEGRAM_BOT_TOKEN' ? opts.token : undefined) };
    return { svc: new NotifyService(prisma as never, config as never), prisma };
  };

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as never;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('token bo‘lmasa hech narsa yubormaydi', async () => {
    const { svc } = make({ settings: { telegramChatId: '1' } });
    expect(svc.configured).toBe(false);
    expect(await svc.notify('newOrder', 'x')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chat ID yo‘q yoki hodisa o‘chirilgan bo‘lsa yubormaydi', async () => {
    expect(await make({ token: 't', settings: null }).svc.notify('newOrder', 'x')).toBe(false);
    expect(await make({ token: 't', settings: { telegramChatId: '1', lowStock: false } }).svc.notify('lowStock', 'x')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('yoqilgan hodisani Telegram Bot API ga yuboradi', async () => {
    const { svc } = make({ token: 'TOKEN', settings: { telegramChatId: '555' } });
    expect(await svc.notify('newOrder', 'Yangi buyurtma')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/botTOKEN/sendMessage');
    expect(JSON.parse(init.body)).toEqual({ chat_id: '555', text: 'Yangi buyurtma' });
  });

  it('yuborish xatosi chaqiruvchiga o‘tmaydi', async () => {
    fetchMock.mockRejectedValue(new Error('tarmoq yo‘q'));
    const { svc } = make({ token: 'T', settings: { telegramChatId: '1' } });
    await expect(svc.notify('paymentFailed', 'x')).resolves.toBe(false);
  });

  it('sinov xabari sababini aytadi', async () => {
    expect(await make({ settings: null }).svc.test()).toMatchObject({ sent: false, reason: expect.stringContaining('TELEGRAM_BOT_TOKEN') });
    expect(await make({ token: 'T', settings: null }).svc.test()).toMatchObject({ sent: false, reason: expect.stringContaining('chat ID') });
    fetchMock.mockResolvedValue({ ok: false });
    expect(await make({ token: 'T', settings: { telegramChatId: '1' } }).svc.test()).toMatchObject({ sent: false });
    fetchMock.mockResolvedValue({ ok: true });
    expect(await make({ token: 'T', settings: { telegramChatId: '1' } }).svc.test()).toEqual({ sent: true });
  });

  it('kechikkan buyurtma haqida har biri uchun bir marta xabar beradi', async () => {
    const { svc } = make({ token: 'T', settings: { telegramChatId: '1' }, late: [{ id: 1, code: 'F-1' }] });
    await svc.checkLate();
    await svc.checkLate();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toContain('F-1');
  });
});
