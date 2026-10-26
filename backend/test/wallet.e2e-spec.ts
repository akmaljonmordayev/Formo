import { INestApplication } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { addDays, todayLocal } from '../src/shop/delivery.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN } from './helpers';

// Provayder kredensiallari — test/setup-env.ts dagi soxta qiymatlar (haqiqiy to'lov yo'q)
const CLICK = { serviceId: process.env.CLICK_SERVICE_ID!, merchantId: process.env.CLICK_MERCHANT_ID!, secret: process.env.CLICK_SECRET_KEY! };
const PAYME = { merchantId: process.env.PAYME_MERCHANT_ID!, key: process.env.PAYME_KEY! };
const INTERNAL = process.env.TELEGRAM_INTERNAL_TOKEN!;

const md5 = (v: string) => createHash('md5').update(v).digest('hex');
const paymeAuth = (key = PAYME.key) => ({ Authorization: `Basic ${Buffer.from(`Paycom:${key}`).toString('base64')}` });

/**
 * Balans va to'lovlar (e2e, real Postgres). Click/Payme callback'lari test kredensiallari bilan
 * simulyatsiya qilinadi — bu haqiqiy to'lov tizimi tekshiruvi EMAS.
 */
describe('Balans, to‘ldirish va to‘lovlar (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let kitId: number;

  const as = (token: string) => ({
    get: (url: string) => api(app).get(url).set(bearer(token)),
    post: (url: string, body?: object) => api(app).post(url).set(bearer(token)).send(body),
    put: (url: string, body?: object) => api(app).put(url).set(bearer(token)).send(body),
  });

  async function customer() {
    const phone = nextPhone();
    const res = await api(app).post('/api/auth/register').send({ phone, password: 'secret123', fullName: 'Balans Mijoz' }).expect(201);
    const token = res.body.accessToken as string;
    const address = await as(token).post('/api/addresses', { label: 'Uy', address: 'Yunusobod 7' }).expect(201);
    return { token, id: res.body.user.id as number, addressId: address.body.id as number };
  }

  const balanceOf = async (userId: number) => (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).balance;

  let tgSeq = 92000000;
  /** Mijozning tasdiqlangan Telegram ulanishi (bot orqali kirishdagi kabi) */
  async function linkTelegram(userId: number) {
    const telegramUserId = String(++tgSeq);
    await prisma.telegramAccount.create({ data: { userId, telegramUserId, chatId: telegramUserId } });
    return telegramUserId;
  }

  const sendReceipt = (telegramUserId: string, fileId: string, fileUniqueId?: string) =>
    api(app).post('/api/internal/telegram/topups/receipt').set(bearer(INTERNAL)).send({ telegramUserId, fileId, fileUniqueId });

  /** Bot orqali chek + admin tasdig'i orqali haqiqiy kirim */
  async function fund(c: { token: string; id: number }, amount: number) {
    const t = await as(c.token).post('/api/wallet/topups', { amount, method: 'MANUAL_CARD' }).expect(201);
    const tg = await prisma.telegramAccount.findUnique({ where: { userId: c.id } });
    await sendReceipt(tg?.telegramUserId ?? (await linkTelegram(c.id)), `AgACAgIAAxkBfund${t.body.id}xx`).expect(200);
    await as(admin).post(`/api/admin/topups/${t.body.id}/approve`).expect(200);
    return t.body.id as number;
  }

  async function checkout(c: { token: string; addressId: number }, paymentMethod: string, expected = 201) {
    await as(c.token).post('/api/cart/items', { kitId, shirtSize: 'M' }).expect(201);
    return as(c.token)
      .post('/api/orders/checkout', {
        addressId: c.addressId,
        deliveryDate: addDays(todayLocal(), 2),
        deliverySlot: '10:00-14:00',
        paymentMethod,
      })
      .expect(expected);
  }

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Category", "Club", "Kit", "Promocode", "Setting", "AuditLog", "TopUp", "BalanceTransaction" RESTART IDENTITY CASCADE',
    );
    admin = (await login(app, SUPERADMIN.phone, SUPERADMIN.password)).accessToken;
    const club = await prisma.club.create({
      data: {
        name: 'Nasaf',
        league: 'Super League',
        season: '2026',
        code: 'NSF',
        markColor: '#1d4ed8',
        kits: { create: [{ label: 'Uy', bgColor: '#1d4ed8', textColor: '#ffffff' }] },
      },
      include: { kits: true },
    });
    kitId = club.kits[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('qo‘lda to‘lov (chek + admin tasdig‘i)', () => {
    it('sozlama saqlanmagan — Formo Humo kartasi; superadmin o‘chirsa — usul o‘chiq', async () => {
      const c = await customer();
      const t = await as(c.token).post('/api/wallet/topups', { amount: 30000, method: 'MANUAL_CARD' }).expect(201);
      expect(t.body.instructions).toMatchObject({ cardNumber: '9860 0112 0207 4545', cardHolder: 'YAKUBOV ABDULLA', bankName: 'Humo' });
      await as(c.token).post(`/api/wallet/topups/${t.body.id}/cancel`).expect(200);

      await as(admin).put('/api/admin/settings/payments.manual', { value: { enabled: false } }).expect(200);
      const methods = await as(c.token).get('/api/wallet/topup-methods').expect(200);
      expect(methods.body.methods.find((m: { method: string }) => m.method === 'MANUAL_CARD').enabled).toBe(false);
      await as(c.token).post('/api/wallet/topups', { amount: 50000, method: 'MANUAL_CARD' }).expect(400);
    });

    it('superadmin rekvizitlarni saqlaydi; summa chegaralari serverda', async () => {
      await as(admin)
        .put('/api/admin/settings/payments.manual', {
          value: { enabled: true, cardNumber: '8600 1234 5678 9012', cardHolder: 'FORMO MCHJ', bankName: 'Test bank' },
        })
        .expect(200);
      const c = await customer();
      await as(c.token).post('/api/wallet/topups', { amount: 9_999, method: 'MANUAL_CARD' }).expect(400);
      await as(c.token).post('/api/wallet/topups', { amount: 10_000_001, method: 'MANUAL_CARD' }).expect(400);
      await as(c.token).post('/api/wallet/topups', { amount: 50000.5, method: 'MANUAL_CARD' }).expect(400);
      // Click/Payme bu yerda test kredensiallari bilan yoqiq, lekin mijoz sozlanmagan usulni tanlay olmaydi
      const res = await as(c.token).post('/api/wallet/topups', { amount: 50000, method: 'MANUAL_CARD' }).expect(201);
      expect(res.body).toMatchObject({
        code: expect.stringMatching(/^TOP-\d{6}$/),
        status: 'PENDING',
        instructions: { type: 'MANUAL', cardNumber: '8600 1234 5678 9012', cardHolder: 'FORMO MCHJ', comment: res.body.code },
      });
    });

    it('ikki marta bosish — ikkinchi so‘rov ochilmaydi; ochiq so‘rovlar limiti', async () => {
      const c = await customer();
      const a = await as(c.token).post('/api/wallet/topups', { amount: 70000, method: 'MANUAL_CARD' }).expect(201);
      const b = await as(c.token).post('/api/wallet/topups', { amount: 70000, method: 'MANUAL_CARD' }).expect(201);
      expect(b.body.id).toBe(a.body.id);
      await as(c.token).post('/api/wallet/topups', { amount: 80000, method: 'MANUAL_CARD' }).expect(201);
      await as(c.token).post('/api/wallet/topups', { amount: 90000, method: 'MANUAL_CARD' }).expect(201);
      await as(c.token).post('/api/wallet/topups', { amount: 95000, method: 'MANUAL_CARD' }).expect(429);
    });

    it('chek (bot) → tekshiruv → admin tasdig‘i: balans bir marta oshadi; parallel tasdiq — bittasi o‘tadi', async () => {
      const c = await customer();
      const t = await as(c.token).post('/api/wallet/topups', { amount: 120000, method: 'MANUAL_CARD' }).expect(201);
      // Bot chekni mijozning Telegram ulanishi orqali biriktiradi
      await prisma.telegramAccount.create({ data: { userId: c.id, telegramUserId: '91000001', chatId: '91000001' } });
      const receipt = await api(app)
        .post('/api/internal/telegram/topups/receipt')
        .set(bearer(INTERNAL))
        .send({ telegramUserId: '91000001', fileId: 'AgACAgIAAxkBAAIBtestfileid' })
        .expect(200);
      expect(receipt.body).toMatchObject({ result: 'OK', topUp: { status: 'REVIEW', hasReceipt: true } });
      expect(JSON.stringify(receipt.body)).not.toContain('AgACAgIAAxkBAAIBtestfileid');

      const results = await Promise.all([1, 2, 3].map(() => as(admin).post(`/api/admin/topups/${t.body.id}/approve`)));
      expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
      expect(await balanceOf(c.id)).toBe(120000);
      expect(await prisma.balanceTransaction.count({ where: { topUpId: t.body.id, type: 'TOPUP' } })).toBe(1);

      // Mijozga Telegram xabari navbatda
      const msg = await prisma.telegramOutbox.findUnique({ where: { dedupeKey: `topup:${t.body.id}:approved` } });
      // ru-RU formatlash ming ajratuvchi sifatida bo'linmas bo'shliq ishlatadi
      expect(msg?.text.replace(/\s/g, ' ')).toContain("120 000 so'm");
      const audit = await prisma.auditLog.findFirst({ where: { category: 'PAYMENT', context: { startsWith: t.body.code } } });
      expect(audit).toBeTruthy();
    });

    it('chek yuborilmagan so‘rovni tasdiqlab bo‘lmaydi (chekning o‘zi ham pul qo‘shmaydi)', async () => {
      const c = await customer();
      const t = await as(c.token).post('/api/wallet/topups', { amount: 40000, method: 'MANUAL_CARD' }).expect(201);
      await as(admin).post(`/api/admin/topups/${t.body.id}/approve`).expect(409);
      await sendReceipt(await linkTelegram(c.id), 'AgACAgIAAxkBnoapprove1').expect(200);
      expect(await balanceOf(c.id)).toBe(0);
      expect((await as(admin).get(`/api/admin/topups/${t.body.id}`).expect(200)).body.status).toBe('REVIEW');
    });

    it('bir xil chek boshqa so‘rovga qayta yuborilsa — DUPLICATE_RECEIPT; o‘sha so‘rovga qayta — almashtiriladi', async () => {
      const a = await customer();
      const b = await customer();
      const tgA = await linkTelegram(a.id);
      const tgB = await linkTelegram(b.id);
      await as(a.token).post('/api/wallet/topups', { amount: 50000, method: 'MANUAL_CARD' }).expect(201);
      await as(b.token).post('/api/wallet/topups', { amount: 50000, method: 'MANUAL_CARD' }).expect(201);
      expect((await sendReceipt(tgA, 'AgACAgIAAxkBdupA1', 'AQADdupuniq1').expect(200)).body.result).toBe('OK');
      expect((await sendReceipt(tgA, 'AgACAgIAAxkBdupA2', 'AQADdupuniq1').expect(200)).body.result).toBe('OK');
      expect((await sendReceipt(tgB, 'AgACAgIAAxkBdupB1', 'AQADdupuniq1').expect(200)).body.result).toBe('DUPLICATE_RECEIPT');
      // B mijozning so'rovi chekni olmadi — tekshiruvga o'tmaydi
      const open = await prisma.topUp.findFirstOrThrow({ where: { userId: b.id } });
      expect(open.status).toBe('PENDING');
    });

    it('ulanmagan Telegram akkaunti chek yubora olmaydi — hech kimga biriktirilmaydi', async () => {
      const res = await sendReceipt('99999999901', 'AgACAgIAAxkBnolink1', 'AQADnolink1').expect(200);
      expect(res.body).toEqual({ result: 'NOT_LINKED' });
      expect(await prisma.topUp.count({ where: { receiptUniqueId: 'AQADnolink1' } })).toBe(0);
    });

    it('admin ko‘rinishi: egasi, tasdiqlangan telefon, Telegram ulanishi, chek vaqti; summa tuzatilsa audit', async () => {
      const c = await customer();
      const tg = await linkTelegram(c.id);
      const t = await as(c.token).post('/api/wallet/topups', { amount: 100000, method: 'MANUAL_CARD' }).expect(201);
      await sendReceipt(tg, 'AgACAgIAAxkBview001', 'AQADview001').expect(200);
      const view = await as(admin).get(`/api/admin/topups/${t.body.id}`).expect(200);
      expect(view.body).toMatchObject({
        status: 'REVIEW',
        receiptTelegramUserId: tg,
        receiptSubmittedAt: expect.any(String),
        user: { id: c.id, phone: expect.stringMatching(/^\+998/) },
        telegram: { telegramUserId: tg },
        linkWarning: null,
      });
      expect(JSON.stringify(view.body)).not.toContain('AgACAgIAAxkBview001');

      await as(admin).post(`/api/admin/topups/${t.body.id}/approve`, { amount: 5000 }).expect(400);
      const ok = await as(admin).post(`/api/admin/topups/${t.body.id}/approve`, { amount: 50000 }).expect(200);
      expect(ok.body).toMatchObject({ status: 'APPROVED', amount: 50000, requestedAmount: 100000, reviewedBy: { fullName: expect.any(String) } });
      expect(await balanceOf(c.id)).toBe(50000);
      const audit = await prisma.auditLog.findFirst({ where: { context: { startsWith: `${t.body.code} · 50000` } } });
      expect(audit?.context).toContain("so'ralgan 100000");
    });

    it('rad etish: sabab bilan, balans o‘zgarmaydi, keyin tasdiqlab bo‘lmaydi', async () => {
      const c = await customer();
      const t = await as(c.token).post('/api/wallet/topups', { amount: 30000, method: 'MANUAL_CARD' }).expect(201);
      await as(admin).post(`/api/admin/topups/${t.body.id}/reject`, { reason: 'x' }).expect(400);
      const res = await as(admin).post(`/api/admin/topups/${t.body.id}/reject`, { reason: 'Chek topilmadi' }).expect(200);
      expect(res.body).toMatchObject({ status: 'REJECTED', rejectReason: 'Chek topilmadi' });
      await as(admin).post(`/api/admin/topups/${t.body.id}/approve`).expect(409);
      expect(await balanceOf(c.id)).toBe(0);
    });

    it('rollar: mijoz va operator tasdiqlay olmaydi; mijoz boshqaning so‘rovini bekor qila olmaydi', async () => {
      const a = await customer();
      const b = await customer();
      const t = await as(a.token).post('/api/wallet/topups', { amount: 20000, method: 'MANUAL_CARD' }).expect(201);
      await as(a.token).post(`/api/admin/topups/${t.body.id}/approve`).expect(403);
      await as(b.token).post(`/api/wallet/topups/${t.body.id}/cancel`).expect(409);
      await as(a.token).post(`/api/wallet/topups/${t.body.id}/cancel`).expect(200);
      await as(admin).post(`/api/admin/topups/${t.body.id}/approve`).expect(409);
    });
  });

  describe('buyurtmani balansdan to‘lash', () => {
    it('balans yetmasa — 400, buyurtma yaratilmaydi, savat saqlanadi', async () => {
      const c = await customer();
      const before = await prisma.order.count();
      const res = await checkout(c, 'BALANCE', 400);
      expect(res.body.message).toMatch(/yetarli emas/);
      expect(await prisma.order.count()).toBe(before);
      expect((await as(c.token).get('/api/cart').expect(200)).body.count).toBe(1);
    });

    it('yetarli bo‘lsa — darhol to‘langan, balans kamayadi; bekor qilinsa bir marta qaytadi', async () => {
      const c = await customer();
      await fund(c, 300000);
      const order = await checkout(c, 'BALANCE');
      expect(order.body).toMatchObject({ status: 'NEW', paymentStatus: 'PAID', paymentMethod: 'BALANCE' });
      const total = order.body.summary.total as number;
      expect(await balanceOf(c.id)).toBe(300000 - total);

      await as(c.token).post(`/api/orders/${order.body.id}/cancel`).expect(200);
      await as(c.token).post(`/api/orders/${order.body.id}/cancel`).expect(409);
      expect(await balanceOf(c.id)).toBe(300000);
      expect(await prisma.balanceTransaction.count({ where: { orderId: order.body.id, type: 'ORDER_REFUND' } })).toBe(1);
      expect((await as(c.token).get(`/api/orders/${order.body.id}`).expect(200)).body.paymentStatus).toBe('REFUNDED');
    });

    it('admin bekor qilsa ham pul qaytadi (bir marta)', async () => {
      const c = await customer();
      await fund(c, 300000);
      const order = await checkout(c, 'BALANCE');
      await api(app).patch(`/api/admin/orders/${order.body.id}/status`).set(bearer(admin)).send({ status: 'CANCELLED' }).expect(200);
      // Takroriy (holat o'zgarmaydi) — ikkinchi qaytarish bo'lmaydi
      await api(app).patch(`/api/admin/orders/${order.body.id}/status`).set(bearer(admin)).send({ status: 'CANCELLED' });
      expect(await balanceOf(c.id)).toBe(300000);
      expect(await prisma.balanceTransaction.count({ where: { orderId: order.body.id, type: 'ORDER_REFUND' } })).toBe(1);
    });

    it('to‘lov kutayotgan (Click) buyurtmani balansdan to‘lash: parallel bosish — bir marta yechiladi', async () => {
      const c = await customer();
      await fund(c, 300000);
      const order = await checkout(c, 'CLICK');
      expect(order.body.status).toBe('PENDING_PAYMENT');
      const results = await Promise.all([1, 2].map(() => as(c.token).post(`/api/orders/${order.body.id}/payment/balance`)));
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await balanceOf(c.id)).toBe(300000 - order.body.summary.total);
      expect(await prisma.balanceTransaction.count({ where: { orderId: order.body.id, type: 'ORDER_PAYMENT' } })).toBe(1);
    });

    it('to‘lov usulini BALANCE ga “almashtirish” pulsiz o‘tib ketmaydi', async () => {
      const c = await customer();
      const order = await checkout(c, 'CLICK');
      await api(app).patch(`/api/orders/${order.body.id}/payment-method`).set(bearer(c.token)).send({ paymentMethod: 'BALANCE' }).expect(400);
      expect((await as(c.token).get(`/api/orders/${order.body.id}`).expect(200)).body.status).toBe('PENDING_PAYMENT');
    });
  });

  describe('Click (simulyatsiya, test kredensiallari)', () => {
    const sign = (p: Record<string, string>, withPrepare: boolean) =>
      md5(
        withPrepare
          ? `${p.click_trans_id}${p.service_id}${CLICK.secret}${p.merchant_trans_id}${p.merchant_prepare_id}${p.amount}${p.action}${p.sign_time}`
          : `${p.click_trans_id}${p.service_id}${CLICK.secret}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`,
      );
    const form = (path: string, p: Record<string, string>) => api(app).post(`/api/payments/click/${path}`).type('form').send(p).expect(200);

    async function clickTopUp(amount = 100000) {
      const c = await customer();
      const t = await as(c.token).post('/api/wallet/topups', { amount, method: 'CLICK' }).expect(201);
      expect(t.body.instructions.payUrl).toContain('https://my.click.uz/services/pay?service_id=12345');
      return { c, id: String(t.body.id) };
    }

    function params(id: string, action: '0' | '1', extra: Record<string, string> = {}) {
      const p: Record<string, string> = {
        click_trans_id: `9${id}77`,
        service_id: CLICK.serviceId,
        click_paydoc_id: '555',
        merchant_trans_id: id,
        amount: '100000.00',
        action,
        error: '0',
        error_note: 'Success',
        sign_time: '2026-10-25 12:00:00',
        ...extra,
      };
      p.sign_string = sign(p, action === '1');
      return p;
    }

    it('noto‘g‘ri imzo — -1, hech narsa o‘zgarmaydi', async () => {
      const { id } = await clickTopUp();
      const p = { ...params(id, '0'), sign_string: 'deadbeef'.repeat(4) };
      expect((await form('prepare', p)).body.error).toBe(-1);
      expect((await prisma.topUp.findUniqueOrThrow({ where: { id: Number(id) } })).providerTransId).toBeNull();
    });

    it('summa mos emas — -2; mavjud bo‘lmagan so‘rov — -5', async () => {
      const { id } = await clickTopUp();
      expect((await form('prepare', params(id, '0', { amount: '1000.00' }))).body.error).toBe(-2);
      expect((await form('prepare', params('999999', '0'))).body.error).toBe(-5);
    });

    it('prepare → complete: balans oshadi; takroriy complete — -4, ikkinchi kirim yo‘q', async () => {
      const { c, id } = await clickTopUp();
      const prep = await form('prepare', params(id, '0'));
      expect(prep.body).toMatchObject({ error: 0, merchant_prepare_id: Number(id) });
      const complete = params(id, '1', { merchant_prepare_id: id });
      const done = await form('complete', complete);
      expect(done.body).toMatchObject({ error: 0, merchant_confirm_id: expect.any(Number) });
      expect((await form('complete', complete)).body.error).toBe(-4);
      expect(await balanceOf(c.id)).toBe(100000);
      expect(await prisma.balanceTransaction.count({ where: { topUpId: Number(id), type: 'TOPUP' } })).toBe(1);
    });

    it('Click to‘lov muvaffaqiyatsiz (error<0) — so‘rov bekor, pul yo‘q', async () => {
      const { c, id } = await clickTopUp();
      await form('prepare', params(id, '0'));
      const res = await form('complete', params(id, '1', { merchant_prepare_id: id, error: '-5017' }));
      expect(res.body.error).toBe(-9);
      expect(await balanceOf(c.id)).toBe(0);
      expect((await prisma.topUp.findUniqueOrThrow({ where: { id: Number(id) } })).status).toBe('CANCELLED');
    });
  });

  describe('Payme (simulyatsiya, test kredensiallari)', () => {
    let rpcId = 0;
    const rpc = (method: string, params: object, auth = paymeAuth()) =>
      api(app).post('/api/payments/payme').set(auth).send({ id: ++rpcId, method, params }).expect(200);

    async function paymeTopUp(amount = 50000) {
      const c = await customer();
      const t = await as(c.token).post('/api/wallet/topups', { amount, method: 'PAYME' }).expect(201);
      const encoded = (t.body.instructions.payUrl as string).split('/').pop()!;
      expect(Buffer.from(encoded, 'base64').toString()).toBe(`m=${PAYME.merchantId};ac.top_up_id=${t.body.id};a=${amount * 100}`);
      return { c, id: t.body.id as number, amount };
    }

    it('noto‘g‘ri kalit — -32504', async () => {
      const res = await rpc('CheckPerformTransaction', {}, paymeAuth('wrong'));
      expect(res.body.error.code).toBe(-32504);
      const none = await api(app).post('/api/payments/payme').send({ id: 1, method: 'CheckTransaction', params: { id: 'x' } }).expect(200);
      expect(none.body.error.code).toBe(-32504);
    });

    it('summa noto‘g‘ri — -31001; so‘rov topilmasa — -31050', async () => {
      const { id, amount } = await paymeTopUp();
      expect((await rpc('CheckPerformTransaction', { amount: amount * 100 + 1, account: { top_up_id: String(id) } })).body.error.code).toBe(-31001);
      expect((await rpc('CheckPerformTransaction', { amount: 100, account: { top_up_id: '999999' } })).body.error.code).toBe(-31050);
      expect((await rpc('CheckPerformTransaction', { amount: amount * 100, account: { top_up_id: String(id) } })).body.result).toEqual({ allow: true });
    });

    it('Create → Perform → Perform (takror): bitta kirim; Check holati 2', async () => {
      const { c, id, amount } = await paymeTopUp();
      const txId = `pm-${id}-a`;
      const created = await rpc('CreateTransaction', { id: txId, time: Date.now(), amount: amount * 100, account: { top_up_id: String(id) } });
      expect(created.body.result).toMatchObject({ state: 1, transaction: String(id) });
      // Ikkinchi tranzaksiya shu so'rovga — rad
      const other = await rpc('CreateTransaction', { id: `pm-${id}-b`, time: Date.now(), amount: amount * 100, account: { top_up_id: String(id) } });
      expect(other.body.error.code).toBe(-31051);

      const p1 = await rpc('PerformTransaction', { id: txId });
      const p2 = await rpc('PerformTransaction', { id: txId });
      expect(p1.body.result.state).toBe(2);
      expect(p2.body.result).toEqual(p1.body.result);
      expect(await balanceOf(c.id)).toBe(amount);
      expect((await rpc('CheckTransaction', { id: txId })).body.result).toMatchObject({ state: 2, cancel_time: 0, reason: null });
      expect((await rpc('PerformTransaction', { id: 'unknown' })).body.error.code).toBe(-31003);
    });

    it('bajarilgandan keyin bekor: pul qaytarib olinadi; sarflangan bo‘lsa -31007', async () => {
      const { c, id, amount } = await paymeTopUp(50000);
      const txId = `pm-${id}-c`;
      await rpc('CreateTransaction', { id: txId, time: Date.now(), amount: amount * 100, account: { top_up_id: String(id) } });
      await rpc('PerformTransaction', { id: txId });
      const cancelled = await rpc('CancelTransaction', { id: txId, reason: 5 });
      expect(cancelled.body.result.state).toBe(-2);
      expect(await balanceOf(c.id)).toBe(0);
      expect((await rpc('CancelTransaction', { id: txId, reason: 5 })).body.result.state).toBe(-2); // takror — o'zgarmaydi

      // Ikkinchi: to'ldirildi, keyin balans buyurtmaga sarflandi — bekor qilish rad etiladi
      const second = await paymeTopUp(300000);
      const tx2 = `pm-${second.id}-d`;
      await rpc('CreateTransaction', { id: tx2, time: Date.now(), amount: second.amount * 100, account: { top_up_id: String(second.id) } });
      await rpc('PerformTransaction', { id: tx2 });
      await checkout(second.c, 'BALANCE');
      expect((await rpc('CancelTransaction', { id: tx2, reason: 5 })).body.error.code).toBe(-31007);
      expect(await balanceOf(second.c.id)).toBeGreaterThanOrEqual(0);
    });

    it('12 soatdan oshgan tranzaksiya bajarilmaydi — -31008, holat -1 reason 4', async () => {
      const { c, id, amount } = await paymeTopUp();
      const txId = `pm-${id}-e`;
      await rpc('CreateTransaction', { id: txId, time: Date.now(), amount: amount * 100, account: { top_up_id: String(id) } });
      await prisma.topUp.update({ where: { id }, data: { createdOnProvider: new Date(Date.now() - 13 * 60 * 60 * 1000) } });
      expect((await rpc('PerformTransaction', { id: txId })).body.error.code).toBe(-31008);
      expect((await rpc('CheckTransaction', { id: txId })).body.result).toMatchObject({ state: -1, reason: 4 });
      expect(await balanceOf(c.id)).toBe(0);
    });

    it('GetStatement davr bo‘yicha', async () => {
      const res = await rpc('GetStatement', { from: Date.now() - 3600_000, to: Date.now() + 1000 });
      expect(res.body.result.transactions.length).toBeGreaterThan(0);
      expect(res.body.result.transactions[0]).toHaveProperty('account.top_up_id');
    });
  });

  it('balans hech qachon manfiy emas (barcha mijozlar)', async () => {
    expect(await prisma.user.count({ where: { balance: { lt: 0 } } })).toBe(0);
  });
});
