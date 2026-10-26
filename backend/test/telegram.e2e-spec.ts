import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { addDays, todayLocal } from '../src/shop/delivery.service';
import { MAX_CODE_ATTEMPTS } from '../src/telegram/telegram-auth.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN } from './helpers';

// test/setup-env.ts: TELEGRAM_BOT_USERNAME=formo_e2e_bot va test ichki tokeni
const INTERNAL = process.env.TELEGRAM_INTERNAL_TOKEN!;

/**
 * Telegram bot orqali kirish: ilova (ochiq API) ↔ bot (ichki API, bu yerda bot o'rniga test).
 * Kod faqat bot javobida keladi — testda ham shu yo'l bilan olinadi.
 */
describe('Telegram bot orqali kirish (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tgSeq = 700_000_000;

  const bot = (path: string, body?: object, token = INTERNAL) =>
    api(app).post(`/api/internal/telegram/${path}`).set(bearer(token)).send(body);

  /** Ilova so'rov ochadi, bot /start bosilganini va kontaktni yuboradi */
  async function challenge(phone: string, tgUser = String(++tgSeq), contactPhone = phone, language?: string) {
    const start = await api(app).post('/api/auth/telegram/start').send({ phone }).expect(200);
    const startToken = start.body.deepLink.split('?start=')[1];
    const claim = await bot('claim', { startToken, telegramUserId: tgUser, chatId: tgUser, language }).expect(200);
    const contact = await bot('contact', { telegramUserId: tgUser, chatId: tgUser, phone: contactPhone }).expect(200);
    return { challengeId: start.body.challengeId as string, startToken, tgUser, claim: claim.body, contact: contact.body };
  }

  const verify = (challengeId: string, code: string) => api(app).post('/api/auth/telegram/verify').send({ challengeId, code });
  const wrong = (code: string) => (code === '00000' ? '11111' : '00000');

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await prisma.$executeRawUnsafe('TRUNCATE "TelegramAuthChallenge", "TelegramOutbox" RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ichki API himoyasi', () => {
    it('tokensiz yoki noto‘g‘ri token bilan — 401', async () => {
      await api(app).post('/api/internal/telegram/resend').send({ telegramUserId: '1' }).expect(401);
      await bot('resend', { telegramUserId: '1' }, `${INTERNAL}x`).expect(401);
      await api(app).get('/api/internal/telegram/outbox').set(bearer('a'.repeat(40))).expect(401);
    });

    it('foydalanuvchi JWT tokeni ichki API ni ochmaydi', async () => {
      const { accessToken } = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      await bot('resend', { telegramUserId: '1' }, accessToken).expect(401);
    });

    it('Swagger hujjatida ichki endpointlar yo‘q', async () => {
      const res = await api(app).get('/api/docs-json').expect(200);
      expect(Object.keys(res.body.paths).some((p) => p.includes('internal'))).toBe(false);
      expect(res.body.paths).toHaveProperty('/api/auth/telegram/start');
    });
  });

  describe('yangi foydalanuvchi', () => {
    const phone = nextPhone();
    let code: string;
    let challengeId: string;

    it('start javobi raqam bor-yo‘qligini oshkor qilmaydi', async () => {
      const a = await api(app).post('/api/auth/telegram/start').send({ phone }).expect(200);
      const b = await api(app).post('/api/auth/telegram/start').send({ phone: SUPERADMIN.phone }).expect(200);
      expect(Object.keys(a.body).sort()).toEqual(Object.keys(b.body).sort());
      expect(a.body.deepLink).toMatch(/^https:\/\/t\.me\/formo_e2e_bot\?start=[A-Za-z0-9_-]{43}$/);
    });

    it('bot: kontakt tasdiqlangach kod beradi; bazada kod va token ochiq saqlanmaydi', async () => {
      const c = await challenge(phone);
      expect(c.claim).toEqual({ result: 'CONTACT_REQUIRED', maskedPhone: expect.stringMatching(/^\+998 \d\d \*\*\* \*\* \d\d$/) });
      expect(c.contact).toMatchObject({ result: 'CODE', code: expect.stringMatching(/^\d{5}$/) });
      code = c.contact.code;
      challengeId = c.challengeId;

      const row = await prisma.telegramAuthChallenge.findUniqueOrThrow({ where: { id: challengeId } });
      expect(JSON.stringify(row)).not.toContain(c.startToken);
      expect(row.codeHash).not.toContain(code);
    });

    it('noto‘g‘ri kod — 401, hisob ochilmaydi', async () => {
      await verify(challengeId, wrong(code)).expect(401);
      expect(await prisma.user.count({ where: { phone } })).toBe(0);
    });

    it('to‘g‘ri kod — hisob ochiladi, profil to‘ldirish so‘raladi', async () => {
      const res = await verify(challengeId, code).expect(200);
      expect(res.body).toMatchObject({ isNewUser: true, profileComplete: false, user: { phone, role: 'USER' } });
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // Profil haqiqiy API orqali saqlanadi
      await api(app)
        .patch('/api/auth/me')
        .set(bearer(res.body.accessToken))
        .send({ fullName: 'Aziz Rahimov', gender: 'MALE', age: 24 })
        .expect(200);
      const user = await prisma.user.findUniqueOrThrow({ where: { phone }, include: { telegram: true } });
      expect(user).toMatchObject({ fullName: 'Aziz Rahimov', gender: 'MALE', age: 24 });
      expect(user.telegram?.telegramUserId).toEqual(expect.stringMatching(/^\d+$/));
    });

    it('kodni qayta ishlatib bo‘lmaydi (replay)', async () => {
      await verify(challengeId, code).expect(401);
    });

    it('mavjud hisob qayta ro‘yxatdan o‘tmaydi, dublikat ochilmaydi', async () => {
      const c = await challenge(phone);
      const res = await verify(c.challengeId, c.contact.code).expect(200);
      expect(res.body).toMatchObject({ isNewUser: false, profileComplete: true, user: { fullName: 'Aziz Rahimov' } });
      expect(await prisma.user.count({ where: { phone } })).toBe(1);
    });
  });

  describe('hujumlar va chekka holatlar', () => {
    it('Telegram’dagi raqam boshqa — kod berilmaydi, so‘rov yopiladi', async () => {
      const c = await challenge(nextPhone(), undefined, '+998901110000');
      expect(c.contact).toEqual({ result: 'PHONE_MISMATCH' });
      // so'rov yopilgan: to'g'ri raqam bilan ham endi kod yo'q
      const again = await bot('contact', { telegramUserId: c.tgUser, chatId: c.tgUser, phone: '+998901110000' }).expect(200);
      expect(again.body).toEqual({ result: 'NO_CHALLENGE' });
    });

    it('boshqa Telegram akkaunti egallangan so‘rovni ololmaydi', async () => {
      const c = await challenge(nextPhone());
      const res = await bot('claim', { startToken: c.startToken, telegramUserId: '123', chatId: '123' }).expect(200);
      expect(res.body).toEqual({ result: 'INVALID' });
    });

    it(`brute-force: ${MAX_CODE_ATTEMPTS} ta xatodan keyin to‘g‘ri kod ham ishlamaydi`, async () => {
      const c = await challenge(nextPhone());
      for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) await verify(c.challengeId, wrong(c.contact.code)).expect(401);
      await verify(c.challengeId, c.contact.code).expect(401);
    });

    it('parallel to‘g‘ri so‘rovlardan faqat bittasi sessiya oladi', async () => {
      const phone = nextPhone();
      const c = await challenge(phone);
      const results = await Promise.all([1, 2, 3].map(() => verify(c.challengeId, c.contact.code)));
      expect(results.map((r) => r.status).sort()).toEqual([200, 401, 401]);
      expect(await prisma.user.count({ where: { phone } })).toBe(1);
    });

    it('muddati o‘tgan kod — 401', async () => {
      const c = await challenge(nextPhone());
      await prisma.telegramAuthChallenge.update({ where: { id: c.challengeId }, data: { codeExpiresAt: new Date(Date.now() - 1000) } });
      await verify(c.challengeId, c.contact.code).expect(401);
    });

    it('qayta yuborish: cooldown', async () => {
      const c = await challenge(nextPhone());
      const res = await bot('resend', { telegramUserId: c.tgUser }).expect(200);
      expect(res.body).toMatchObject({ result: 'COOLDOWN', retryAfterSec: expect.any(Number) });
    });

    it('xodim hisobi (superadmin) Telegram orqali kira olmaydi va ulanmaydi', async () => {
      const c = await challenge(SUPERADMIN.phone);
      await verify(c.challengeId, c.contact.code).expect(403);
      expect(await prisma.telegramAccount.count({ where: { telegramUserId: c.tgUser } })).toBe(0);
    });

    it('bloklangan foydalanuvchi — 403', async () => {
      const phone = nextPhone();
      await prisma.user.create({ data: { phone, fullName: 'Bloklangan', passwordHash: 'x', isActive: false } });
      const c = await challenge(phone);
      await verify(c.challengeId, c.contact.code).expect(403);
    });

    it('noto‘g‘ri formatdagi so‘rovlar — 400', async () => {
      await verify('not-a-uuid', '12345').expect(400);
      await verify('11111111-1111-4111-8111-111111111111', '1234').expect(400);
      await bot('claim', { startToken: 'short', telegramUserId: '1', chatId: '1' }).expect(400);
      await bot('contact', { telegramUserId: 'abc', chatId: '1', phone: '+998901234567' }).expect(400);
    });
  });

  it('kirishda botda tanlangan til ulangan akkauntga yoziladi', async () => {
    const c = await challenge(nextPhone(), undefined, undefined, 'en');
    await verify(c.challengeId, c.contact.code).expect(200);
    expect(await prisma.telegramAccount.findUnique({ where: { telegramUserId: c.tgUser } })).toMatchObject({ language: 'en' });
  });

  describe('buyurtma xabarlari (outbox)', () => {
    let userToken: string;
    let tgUser: string;
    let kitId: number;
    let addressId: number;

    beforeAll(async () => {
      const phone = nextPhone();
      const c = await challenge(phone);
      tgUser = c.tgUser;
      userToken = (await verify(c.challengeId, c.contact.code).expect(200)).body.accessToken;
      await prisma.$executeRawUnsafe('TRUNCATE "Category", "Club", "Kit", "Promocode", "Setting" RESTART IDENTITY CASCADE');
      const club = await prisma.club.create({
        data: {
          name: 'Pakhtakor',
          league: 'Super League',
          season: '2026',
          code: 'PAK',
          markColor: '#0a7d3b',
          kits: { create: [{ label: 'Uy', bgColor: '#0a7d3b', textColor: '#ffffff' }] },
        },
        include: { kits: true },
      });
      kitId = club.kits[0].id;
      addressId = (await api(app).post('/api/addresses').set(bearer(userToken)).send({ label: 'Uy', address: 'Chilonzor 9' }).expect(201)).body.id;
    });

    async function placeOrder() {
      await api(app).post('/api/cart/items').set(bearer(userToken)).send({ kitId, shirtSize: 'M' }).expect(201);
      const res = await api(app)
        .post('/api/orders/checkout')
        .set(bearer(userToken))
        .send({ addressId, deliveryDate: addDays(todayLocal(), 1), deliverySlot: '10:00-14:00', paymentMethod: 'CASH' })
        .expect(201);
      return res.body as { id: number; code: string };
    }

    it('buyurtma holati ulangan mijozga navbatga qo‘yiladi; bot oladi va natijani qaytaradi', async () => {
      const order = await placeOrder();
      const leased = await api(app).get('/api/internal/telegram/outbox?limit=10').set(bearer(INTERNAL)).expect(200);
      expect(leased.body).toEqual([expect.objectContaining({ chatId: tgUser, text: `📦 ${order.code} buyurtmangiz holati: Qabul qilindi` })]);

      // band qilingan xabar boshqa bot nusxasiga qayta berilmaydi
      expect((await api(app).get('/api/internal/telegram/outbox').set(bearer(INTERNAL)).expect(200)).body).toEqual([]);

      const id = leased.body[0].id;
      await bot(`outbox/${id}/result`, { result: 'SENT' }).expect(200);
      await bot(`outbox/${id}/result`, { result: 'FAILED' }).expect(200); // takroriy — e'tiborsiz
      const row = await prisma.telegramOutbox.findUniqueOrThrow({ where: { id } });
      expect(row).toMatchObject({ status: 'SENT', attempts: 1 });
    });

    it('bot bloklansa keyingi xabarlar navbatga qo‘yilmaydi; /start qayta yoqadi', async () => {
      await placeOrder();
      const [msg] = (await api(app).get('/api/internal/telegram/outbox').set(bearer(INTERNAL)).expect(200)).body;
      await bot(`outbox/${msg.id}/result`, { result: 'BLOCKED', error: '403 Forbidden' }).expect(200);

      await placeOrder();
      expect((await api(app).get('/api/internal/telegram/outbox').set(bearer(INTERNAL)).expect(200)).body).toEqual([]);

      expect((await bot('hello', { telegramUserId: tgUser, chatId: tgUser }).expect(200)).body).toEqual({ linked: true, language: null });
      await placeOrder();
      expect((await api(app).get('/api/internal/telegram/outbox').set(bearer(INTERNAL)).expect(200)).body).toHaveLength(1);
    });

    it('botda tanlangan til: buyurtma xabari shu tilda, hello tilni qaytaradi', async () => {
      await bot('language', { telegramUserId: tgUser, language: 'ru' }).expect(200);
      expect((await bot('hello', { telegramUserId: tgUser, chatId: tgUser }).expect(200)).body).toEqual({ linked: true, language: 'ru' });
      const order = await placeOrder();
      const leased = await api(app).get('/api/internal/telegram/outbox?limit=10').set(bearer(INTERNAL)).expect(200);
      expect(leased.body).toEqual([expect.objectContaining({ text: `📦 Статус заказа ${order.code}: Принят` })]);
      await bot(`outbox/${leased.body[0].id}/result`, { result: 'SENT' }).expect(200);
    });

    it('/stop — xabarlar o‘chadi', async () => {
      expect((await bot('stop', { telegramUserId: tgUser }).expect(200)).body).toEqual({ linked: true });
      await placeOrder();
      expect(await prisma.telegramAccount.findFirst({ where: { telegramUserId: tgUser } })).toMatchObject({ chatId: null });
    });
  });
});
