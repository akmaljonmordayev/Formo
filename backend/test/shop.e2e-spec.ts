import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { addDays, todayLocal } from '../src/shop/delivery.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN, XSS_PAYLOADS } from './helpers';

/**
 * Mobil ilova oqimi (dizayn bo'yicha): katalog → klub → forma → konstruktor → savat →
 * rasmiylashtirish → to'lov → buyurtma qabul qilindi → kuzatish.
 */
describe('Katalog, savat va buyurtma (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let user: string;
  let other: string;

  const tomorrow = () => addDays(todayLocal(), 1);

  const as = (token: string) => ({
    get: (url: string) => api(app).get(url).set(bearer(token)),
    post: (url: string, body?: object) => api(app).post(url).set(bearer(token)).send(body),
    patch: (url: string, body?: object) => api(app).patch(url).set(bearer(token)).send(body),
    put: (url: string, body?: object) => api(app).put(url).set(bearer(token)).send(body),
    delete: (url: string) => api(app).delete(url).set(bearer(token)),
  });

  async function register(fullName: string) {
    const res = await api(app)
      .post('/api/auth/register')
      .send({ phone: nextPhone(), password: 'secret123', fullName })
      .expect(201);
    return res.body.accessToken as string;
  }

  let laliga: { id: number; slug: string };
  let real: { id: number; kits: { id: number; label: string }[] };
  let homeKit: number;
  let awayKit: number;
  let addressId: number;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Category", "Club", "Kit", "Promocode", "Setting", "AuditLog" RESTART IDENTITY CASCADE',
    );
    admin = (await login(app, SUPERADMIN.phone, SUPERADMIN.password)).accessToken;
    user = await register('Aziz Karimov');
    other = await register('Boshqa Odam');
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  describe('Admin: kategoriya va unga biriktirilgan klub/formalar', () => {
    it('kategoriya yaratiladi, slug avtomatik', async () => {
      const res = await as(admin).post('/api/admin/categories', { name: 'LaLiga', sortOrder: 1 }).expect(201);
      expect(res.body).toMatchObject({ name: 'LaLiga', slug: 'laliga', isActive: true });
      laliga = res.body;
    });

    it('takroriy nom — 409, XSS — 400, USER — 403', async () => {
      await as(admin).post('/api/admin/categories', { name: 'laliga' }).expect(409);
      await as(admin).post('/api/admin/categories', { name: XSS_PAYLOADS[0] }).expect(400);
      await as(user).post('/api/admin/categories', { name: 'Serie A' }).expect(403);
    });

    it('klub categoryId bilan yaratiladi — league kategoriya nomidan olinadi, narx va o‘lchamlar saqlanadi', async () => {
      const res = await as(admin)
        .post('/api/admin/clubs', {
          name: 'Real Madrid',
          categoryId: laliga.id,
          season: '2026/27',
          code: 'RM',
          markColor: '#ffffff',
          kits: [
            {
              label: 'Uy',
              bgColor: '#ffffff',
              textColor: '#f5a55e',
              colorsLabel: 'Oq / oltin',
              description: 'Dry-fit polyester · DTF bosma',
              sizes: ['S', 'M', 'L', 'XL', '3XL', '8-9'],
            },
            { label: 'Mehmon', bgColor: '#1b1f45', textColor: '#ffffff', colorsLabel: "To'q ko'k / oq" },
            { label: 'Uchinchi', bgColor: '#2b2e7a', textColor: '#f5a55e', shirtPrice: 109000 },
          ],
        })
        .expect(201);
      expect(res.body).toMatchObject({ league: 'LaLiga', categoryId: laliga.id, category: { slug: 'laliga' } });
      expect(res.body.kits).toHaveLength(3);
      expect(res.body.kits[0]).toMatchObject({ shirtPrice: 99000, shortsPrice: 60000, printPrice: 30000 });
      real = res.body;
      homeKit = real.kits[0].id;
      awayKit = real.kits[1].id;
    });

    it("eski panel kabi faqat league yuborilsa kategoriya o'zi yaratiladi", async () => {
      const res = await as(admin)
        .post('/api/admin/clubs', {
          name: 'Liverpool',
          league: 'Premier League',
          season: '2026/27',
          code: 'LI',
          markColor: '#b01e32',
          kits: [{ label: 'Uy', bgColor: '#b01e32', textColor: '#f6d67b' }],
        })
        .expect(201);
      expect(res.body.category).toMatchObject({ name: 'Premier League', slug: 'premier-league' });
    });

    it("noto'g'ri o'lcham va mavjud bo'lmagan kategoriya — 400", async () => {
      const base = { name: 'X', season: '2026/27', code: 'X', markColor: '#000000' };
      await as(admin)
        .post('/api/admin/clubs', { ...base, league: 'Test', kits: [{ label: 'Uy', bgColor: '#fff', textColor: '#000', sizes: ['XXXXL'] }] })
        .expect(400);
      await as(admin)
        .post('/api/admin/clubs', { ...base, categoryId: 9999, kits: [{ label: 'Uy', bgColor: '#fff', textColor: '#000' }] })
        .expect(400);
      await as(admin)
        .post('/api/admin/clubs', { ...base, kits: [{ label: 'Uy', bgColor: '#fff', textColor: '#000' }] })
        .expect(400);
    });

    it('admin klublar ro‘yxatini categoryId bo‘yicha filtrlaydi', async () => {
      const res = await as(admin).get(`/api/admin/clubs?categoryId=${laliga.id}`).expect(200);
      expect(res.body.items.map((c: { name: string }) => c.name)).toEqual(['Real Madrid']);
    });

    it('bitta formaning narxini tahrirlash', async () => {
      const res = await as(admin).patch(`/api/admin/clubs/kits/${awayKit}`, { printPrice: 35000 }).expect(200);
      expect(res.body.printPrice).toBe(35000);
      await as(admin).patch('/api/admin/clubs/kits/99999', { printPrice: 1 }).expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Katalog (ochiq)', () => {
    it('kategoriyalar tokensiz ochiladi, klublar soni bilan', async () => {
      const res = await api(app).get('/api/catalog/categories').expect(200);
      // Avto-yaratilgan "Premier League" sortOrder=0, LaLiga — 1
      expect(res.body).toEqual([
        expect.objectContaining({ name: 'Premier League', slug: 'premier-league', clubsCount: 1 }),
        expect.objectContaining({ name: 'LaLiga', slug: 'laliga', clubsCount: 1 }),
      ]);
    });

    it('klublar: hammasi, kategoriya id/slug va qidiruv bo‘yicha', async () => {
      const all = await api(app).get('/api/catalog/clubs').expect(200);
      expect(all.body.total).toBe(2);
      expect(all.body.items[0]).toMatchObject({ name: 'Liverpool', kitsCount: 1 });

      const byId = await api(app).get(`/api/catalog/clubs?categoryId=${laliga.id}`).expect(200);
      expect(byId.body.items.map((c: { name: string }) => c.name)).toEqual(['Real Madrid']);

      const bySlug = await api(app).get('/api/catalog/clubs?category=premier-league').expect(200);
      expect(bySlug.body.items.map((c: { name: string }) => c.name)).toEqual(['Liverpool']);

      const search = await api(app).get('/api/catalog/clubs?search=REAL').expect(200);
      expect(search.body.items).toHaveLength(1);
      expect(search.body.items[0]).toMatchObject({ name: 'Real Madrid', code: 'RM', kitsCount: 3, category: { name: 'LaLiga' } });
    });

    it('klub sahifasi: Uy/Mehmon/Uchinchi formalari to‘plam narxi bilan', async () => {
      const res = await api(app).get(`/api/catalog/clubs/${real.id}`).expect(200);
      expect(res.body.kits.map((k: { title: string }) => k.title)).toEqual(['Uy formasi', 'Mehmon formasi', 'Uchinchi formasi']);
      expect(res.body.kits[0]).toMatchObject({ price: 189000, colorsLabel: 'Oq / oltin', includes: 'Futbolka + shortik' });
      expect(res.body.kits[1].price).toBe(194000);
      expect(res.body.kits[2].price).toBe(199000);
    });

    it("forma tafsiloti: narx tarkibi, o'lchamlar (XXL tugagan), boshqa formalar", async () => {
      const res = await api(app).get(`/api/catalog/kits/${homeKit}`).expect(200);
      expect(res.body.priceBreakdown).toEqual({ shirt: 99000, shorts: 60000, print: 30000 });
      expect(res.body.club).toMatchObject({ name: 'Real Madrid', season: '2026/27' });
      expect(res.body.siblings.map((k: { label: string }) => k.label)).toEqual(['Uy', 'Mehmon', 'Uchinchi']);
      expect(res.body.sizes).toEqual(
        expect.arrayContaining([
          { size: 'L', available: true },
          { size: 'XXL', available: false },
          { size: '8-9', available: true },
        ]),
      );
    });

    it("nofaol forma va klub ko'rinmaydi", async () => {
      await as(admin).patch(`/api/admin/clubs/kits/${real.kits[2].id}`, { isActive: false }).expect(200);
      await api(app).get(`/api/catalog/kits/${real.kits[2].id}`).expect(404);
      const club = await api(app).get(`/api/catalog/clubs/${real.id}`).expect(200);
      expect(club.body.kits).toHaveLength(2);

      const liverpool = await prisma.club.findFirstOrThrow({ where: { name: 'Liverpool' } });
      await as(admin).patch(`/api/admin/clubs/${liverpool.id}`, { isActive: false }).expect(200);
      await api(app).get(`/api/catalog/clubs/${liverpool.id}`).expect(404);
      const list = await api(app).get('/api/catalog/clubs').expect(200);
      expect(list.body.total).toBe(1);
      await as(admin).patch(`/api/admin/clubs/${liverpool.id}`, { isActive: true }).expect(200);
    });

    it("noto'g'ri id va query — 400", async () => {
      await api(app).get('/api/catalog/clubs/abc').expect(400);
      await api(app).get('/api/catalog/clubs?category=Bad%20Slug').expect(400);
      await api(app).get('/api/catalog/clubs?limit=1000').expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Sevimli klublar', () => {
    it('qo‘shish (idempotent), ro‘yxat, olib tashlash', async () => {
      await as(user).put(`/api/catalog/clubs/${real.id}/favorite`).expect(200);
      await as(user).put(`/api/catalog/clubs/${real.id}/favorite`).expect(200);
      const list = await as(user).get('/api/catalog/favorites').expect(200);
      expect(list.body).toEqual([expect.objectContaining({ id: real.id, name: 'Real Madrid' })]);

      const others = await as(other).get('/api/catalog/favorites').expect(200);
      expect(others.body).toEqual([]);

      await as(user).delete(`/api/catalog/clubs/${real.id}/favorite`).expect(200);
      expect((await as(user).get('/api/catalog/favorites')).body).toEqual([]);
    });

    it('tokensiz 401, admin 403, mavjud bo‘lmagan klub 404', async () => {
      await api(app).put(`/api/catalog/clubs/${real.id}/favorite`).expect(401);
      await as(admin).put(`/api/catalog/clubs/${real.id}/favorite`).expect(403);
      await as(user).put('/api/catalog/clubs/99999/favorite').expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Savat', () => {
    it("bo'sh savat", async () => {
      const res = await as(user).get('/api/cart').expect(200);
      expect(res.body).toMatchObject({ items: [], count: 0, summary: { subtotal: 0, delivery: 0, total: 0 } });
    });

    it('tokensiz 401, admin 403', async () => {
      await api(app).get('/api/cart').expect(401);
      await as(admin).get('/api/cart').expect(403);
    });

    it('konstruktordan qo‘shish: AZIZ · 10 · L / L = 189 000', async () => {
      const res = await as(user)
        .post('/api/cart/items', { kitId: homeKit, printName: 'aziz', printNumber: '10', shirtSize: 'l', shortsSize: 'L', numberOnShorts: true })
        .expect(201);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        title: 'Real Madrid · Uy formasi',
        subtitle: 'AZIZ · 10 · L / L',
        printName: 'AZIZ',
        unitPrice: 189000,
        totalPrice: 189000,
        quantity: 1,
        available: true,
      });
      expect(res.body.summary).toEqual({ subtotal: 189000, discount: 0, delivery: 15000, total: 204000 });
    });

    it('aynan shu forma qayta qo‘shilsa soni oshadi', async () => {
      const res = await as(user)
        .post('/api/cart/items', { kitId: homeKit, printName: 'AZIZ', printNumber: '10', shirtSize: 'L', shortsSize: 'L', numberOnShorts: true })
        .expect(201);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(2);
      expect(res.body.count).toBe(2);
    });

    it("shortik o'lchami berilmasa futbolka o'lchami olinadi; ismsiz — bosma narxisiz", async () => {
      const res = await as(user).post('/api/cart/items', { kitId: awayKit, shirtSize: 'M' }).expect(201);
      const line = res.body.items[1];
      expect(line).toMatchObject({ shortsSize: 'M', unitPrice: 159000, subtitle: 'M / M' });
    });

    it("tugagan o'lcham, noto'g'ri raqam, XSS, nofaol forma — rad etiladi", async () => {
      await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'XXL' }).expect(400);
      await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'L', printNumber: '100' }).expect(400);
      await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'L', quantity: 21 }).expect(400);
      for (const payload of XSS_PAYLOADS.slice(0, 4)) {
        await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'L', printName: payload }).expect(400);
      }
      await as(user).post('/api/cart/items', { kitId: real.kits[2].id, shirtSize: 'L' }).expect(404);
      await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'L', price: 1 }).expect(400);
    });

    it('qatorni o‘zgartirish: soni −/+, shortiksiz', async () => {
      const cart = await as(user).get('/api/cart').expect(200);
      const id = cart.body.items[1].id;

      const res = await as(user).patch(`/api/cart/items/${id}`, { quantity: 3, withShorts: false }).expect(200);
      expect(res.body.items[1]).toMatchObject({ quantity: 3, withShorts: false, shortsSize: null, unitPrice: 99000 });

      await as(user).patch(`/api/cart/items/${id}`, { quantity: 0 }).expect(400);
      await as(other).patch(`/api/cart/items/${id}`, { quantity: 1 }).expect(404);
      await as(other).delete(`/api/cart/items/${id}`).expect(404);

      const removed = await as(user).delete(`/api/cart/items/${id}`).expect(200);
      expect(removed.body.items).toHaveLength(1);
    });

    it("admin formani tahrirlasa savatdagi qator saqlanadi (forma id o'zgarmaydi)", async () => {
      const club = await as(admin).get(`/api/admin/clubs?categoryId=${laliga.id}`).expect(200);
      const kits = club.body.items[0].kits.map((k: Record<string, unknown>) => ({
        id: k.id,
        label: k.label,
        bgColor: k.bgColor,
        textColor: k.textColor,
      }));
      kits[0].colorsLabel = 'Oq / tilla';
      await as(admin).patch(`/api/admin/clubs/${real.id}`, { kits }).expect(200);

      const cart = await as(user).get('/api/cart').expect(200);
      expect(cart.body.items).toHaveLength(1);
      expect(cart.body.items[0].kitId).toBe(homeKit);

      const kit = await api(app).get(`/api/catalog/kits/${homeKit}`).expect(200);
      expect(kit.body.colorsLabel).toBe('Oq / tilla');
    });

    it('boshqa klubning formasini id bilan yuborib bo‘lmaydi', async () => {
      const liverpool = await prisma.club.findFirstOrThrow({ where: { name: 'Liverpool' }, include: { kits: true } });
      await as(admin)
        .patch(`/api/admin/clubs/${real.id}`, {
          kits: [{ id: liverpool.kits[0].id, label: 'Uy', bgColor: '#fff', textColor: '#000' }],
        })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Promokod', () => {
    beforeAll(async () => {
      await as(admin).post('/api/admin/promocodes', { code: 'FORMO10', type: 'PERCENT', value: 10 }).expect(201);
      await as(admin).post('/api/admin/promocodes', { code: 'BIG', type: 'FIXED', value: 50000, minSum: 1000000 }).expect(201);
      await as(admin).post('/api/admin/promocodes', { code: 'FREESHIP', type: 'FREE_SHIPPING' }).expect(201);
    });

    it('"Qo‘llash": 378 000 dan 10% = 37 800', async () => {
      const res = await as(user).post('/api/cart/promocode', { code: 'formo10' }).expect(200);
      expect(res.body.promocode).toMatchObject({ code: 'FORMO10', type: 'PERCENT', value: 10 });
      expect(res.body.summary).toEqual({ subtotal: 378000, discount: 37800, delivery: 15000, total: 355200 });

      const viaQuery = await as(user).get('/api/cart?promocode=FORMO10').expect(200);
      expect(viaQuery.body.summary.total).toBe(355200);
    });

    it('bepul yetkazish', async () => {
      const res = await as(user).get('/api/cart?promocode=FREESHIP').expect(200);
      expect(res.body.summary).toMatchObject({ delivery: 0, discount: 0, total: 378000 });
    });

    it("yo'q, minimal summaga yetmagan va o'chirilgan promokod — 400", async () => {
      await as(user).post('/api/cart/promocode', { code: 'NOPE1' }).expect(400);
      const big = await as(user).post('/api/cart/promocode', { code: 'BIG' }).expect(400);
      expect(big.body.message).toBe("Promokod 1 000 000 so'mdan yuqori buyurtmalar uchun");
      const promo = await prisma.promocode.findUniqueOrThrow({ where: { code: 'FREESHIP' } });
      await as(admin).patch(`/api/admin/promocodes/${promo.id}`, { isActive: false }).expect(200);
      await as(user).get('/api/cart?promocode=FREESHIP').expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Manzillar', () => {
    it('birinchi manzil avtomatik asosiy', async () => {
      const res = await as(user)
        .post('/api/addresses', { label: 'Uy', address: 'Yunusobod, Amir Temur 108', apartment: '45-xonadon' })
        .expect(201);
      expect(res.body.isDefault).toBe(true);
      addressId = res.body.id;
    });

    it('yangi asosiy manzil eskisini almashtiradi; o‘chirilsa boshqasi asosiy bo‘ladi', async () => {
      const work = await as(user)
        .post('/api/addresses', { label: 'Ish', address: 'Chilonzor, Bunyodkor 1', isDefault: true })
        .expect(201);
      let list = await as(user).get('/api/addresses').expect(200);
      expect(list.body.map((a: { label: string; isDefault: boolean }) => [a.label, a.isDefault])).toEqual([
        ['Ish', true],
        ['Uy', false],
      ]);

      await as(user).delete(`/api/addresses/${work.body.id}`).expect(200);
      list = await as(user).get('/api/addresses').expect(200);
      expect(list.body).toEqual([expect.objectContaining({ id: addressId, isDefault: true })]);
    });

    it('boshqa foydalanuvchining manzili 404; XSS 400', async () => {
      await as(other).patch(`/api/addresses/${addressId}`, { label: 'X' }).expect(404);
      await as(other).delete(`/api/addresses/${addressId}`).expect(404);
      await as(user).post('/api/addresses', { label: 'Uy', address: XSS_PAYLOADS[1] }).expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Rasmiylashtirish va to‘lov', () => {
    let orderId: number;

    it('yetkazish vaqtlari: ertadan boshlab, narx bilan', async () => {
      const res = await as(user).get('/api/checkout/delivery-slots').expect(200);
      expect(res.body.fee).toBe(15000);
      expect(res.body.days).toHaveLength(3);
      expect(res.body.days[0]).toMatchObject({ date: tomorrow(), dayLabel: 'Ertaga' });
      expect(res.body.days[0].slots[0]).toMatchObject({ slot: '10:00-14:00', remaining: 50, available: true });
    });

    const checkoutBody = (overrides = {}) => ({
      addressId,
      deliveryDate: tomorrow(),
      deliverySlot: '10:00-14:00',
      paymentMethod: 'CLICK',
      promocode: 'FORMO10',
      comment: 'Domofon ishlamaydi',
      ...overrides,
    });

    it("noto'g'ri sana, slot, manzil — rad etiladi; savat o'zgarmaydi", async () => {
      await as(user).post('/api/orders/checkout', checkoutBody({ deliveryDate: todayLocal() })).expect(400);
      await as(user).post('/api/orders/checkout', checkoutBody({ deliveryDate: addDays(todayLocal(), 30) })).expect(400);
      await as(user).post('/api/orders/checkout', checkoutBody({ deliverySlot: '07:00-08:00' })).expect(400);
      await as(user).post('/api/orders/checkout', checkoutBody({ paymentMethod: 'BITCOIN' })).expect(400);
      await as(other).post('/api/orders/checkout', checkoutBody()).expect(404);
      await as(user).post('/api/orders/checkout', checkoutBody({ promocode: 'BIG' })).expect(400);
      const cart = await as(user).get('/api/cart').expect(200);
      expect(cart.body.items).toHaveLength(1);
    });

    it('bo‘sh savat bilan buyurtma — 400', async () => {
      const addr = await as(other).post('/api/addresses', { label: 'Uy', address: 'Sergeli 5, 12-uy' }).expect(201);
      await as(other).post('/api/orders/checkout', checkoutBody({ addressId: addr.body.id })).expect(400);
    });

    it('Click bilan buyurtma: to‘lov kutilmoqda, narx serverda hisoblanadi, savat tozalanadi', async () => {
      const res = await as(user).post('/api/orders/checkout', checkoutBody()).expect(201);
      orderId = res.body.id;
      expect(res.body.code).toBe(`FRM-${String(orderId).padStart(6, '0')}`);
      expect(res.body).toMatchObject({
        status: 'PENDING_PAYMENT',
        paymentMethod: 'CLICK',
        paymentStatus: 'PENDING',
        summary: { subtotal: 378000, discount: 37800, delivery: 15000, total: 355200 },
        promocode: 'FORMO10',
        itemsCount: 2,
        delivery: { date: tomorrow(), slot: '10:00-14:00', label: 'ertaga, 10:00-14:00', address: 'Yunusobod, Amir Temur 108, 45-xonadon' },
        comment: 'Domofon ishlamaydi',
        payment: { method: 'CLICK', amount: 355200, required: true, demo: true },
      });
      expect(res.body.items).toEqual([
        expect.objectContaining({ clubName: 'Real Madrid', kitLabel: 'Uy', printName: 'AZIZ', quantity: 2, unitPrice: 189000, totalPrice: 378000 }),
      ]);
      const expiresIn = new Date(res.body.payment.expiresAt).getTime() - Date.now();
      expect(expiresIn).toBeGreaterThan(29 * 60 * 1000);
      expect(expiresIn).toBeLessThanOrEqual(30 * 60 * 1000);

      expect((await as(user).get('/api/cart').expect(200)).body.items).toEqual([]);
      expect((await prisma.promocode.findUniqueOrThrow({ where: { code: 'FORMO10' } })).usedCount).toBe(1);
    });

    it('buyurtmalarim va faol buyurtma', async () => {
      const list = await as(user).get('/api/orders').expect(200);
      expect(list.body.total).toBe(1);
      const active = await as(user).get('/api/orders/active').expect(200);
      expect(active.body.order).toMatchObject({ id: orderId, statusLabel: "To'lov kutilmoqda" });
      expect((await as(other).get('/api/orders/active').expect(200)).body.order).toBeNull();
    });

    it("begona buyurtma ko'rinmaydi va boshqarilmaydi", async () => {
      await as(other).get(`/api/orders/${orderId}`).expect(404);
      await as(other).post(`/api/orders/${orderId}/payment/confirm`).expect(404);
      await as(other).post(`/api/orders/${orderId}/cancel`).expect(404);
    });

    it('"To‘lovni tasdiqlash (demo)" → qabul qilindi, kuzatish', async () => {
      const res = await as(user).post(`/api/orders/${orderId}/payment/confirm`).expect(200);
      expect(res.body).toMatchObject({ status: 'ACCEPTED', paymentStatus: 'PAID', payment: { required: false } });
      expect(res.body.timeline[0]).toMatchObject({ status: 'ACCEPTED', done: true, current: true });
      expect(res.body.timeline[1]).toMatchObject({ status: 'PRINTING', done: false });

      await as(user).post(`/api/orders/${orderId}/payment/confirm`).expect(409);
      await as(user).patch(`/api/orders/${orderId}/payment-method`, { paymentMethod: 'CASH' }).expect(409);
    });

    it('admin panel buyurtmani mahsulot qatorlari bilan ko‘radi', async () => {
      const res = await as(admin).get('/api/admin/orders').expect(200);
      const order = res.body.items.find((o: { id: number }) => o.id === orderId);
      expect(order).toMatchObject({ customerName: 'Aziz Karimov', totalSum: 355200, club: { name: 'Real Madrid' }, quantity: 2 });
      expect(order.items).toHaveLength(1);
    });

    it("to'langan buyurtma bekor qilinsa pul qaytariladi va promokod bo'shaydi", async () => {
      const res = await as(user).post(`/api/orders/${orderId}/cancel`).expect(200);
      expect(res.body).toMatchObject({ status: 'CANCELLED', paymentStatus: 'REFUNDED', canCancel: false });
      expect((await prisma.promocode.findUniqueOrThrow({ where: { code: 'FORMO10' } })).usedCount).toBe(0);
      await as(user).post(`/api/orders/${orderId}/cancel`).expect(409);
    });

    it('bosishga berilgan buyurtmani bekor qilib bo‘lmaydi', async () => {
      await as(user).post('/api/cart/items', { kitId: awayKit, shirtSize: 'S' }).expect(201);
      const res = await as(user).post('/api/orders/checkout', checkoutBody({ paymentMethod: 'CASH', promocode: undefined })).expect(201);
      expect(res.body).toMatchObject({ status: 'ACCEPTED', paymentMethod: 'CASH', paymentStatus: 'PENDING', payment: { required: false } });
      expect(res.body.summary).toEqual({ subtotal: 159000, discount: 0, delivery: 15000, total: 174000 });

      await as(admin).patch(`/api/admin/orders/${res.body.id}/status`, { status: 'PRINTING' }).expect(200);
      const order = await as(user).get(`/api/orders/${res.body.id}`).expect(200);
      expect(order.body).toMatchObject({ statusLabel: 'Bosilmoqda', canCancel: false });
      expect(order.body.timeline.filter((s: { done: boolean }) => s.done)).toHaveLength(2);
      await as(user).post(`/api/orders/${res.body.id}/cancel`).expect(409);
    });

    it("\"Boshqa usulni tanlash\": Click → Naqd darhol qabul qilinadi", async () => {
      await as(user).post('/api/cart/items', { kitId: awayKit, shirtSize: 'S' }).expect(201);
      const res = await as(user).post('/api/orders/checkout', checkoutBody({ paymentMethod: 'PAYME', promocode: undefined })).expect(201);
      expect(res.body.status).toBe('PENDING_PAYMENT');
      const changed = await as(user).patch(`/api/orders/${res.body.id}/payment-method`, { paymentMethod: 'CASH' }).expect(200);
      expect(changed.body).toMatchObject({ status: 'ACCEPTED', paymentMethod: 'CASH', paymentExpiresAt: null });
    });

    it('30 daqiqada to‘lanmagan buyurtma avtomatik bekor bo‘ladi', async () => {
      await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'M' }).expect(201);
      const res = await as(user).post('/api/orders/checkout', checkoutBody()).expect(201);
      expect((await prisma.promocode.findUniqueOrThrow({ where: { code: 'FORMO10' } })).usedCount).toBe(1);
      await prisma.order.update({ where: { id: res.body.id }, data: { paymentExpiresAt: new Date(Date.now() - 1000) } });

      const order = await as(user).get(`/api/orders/${res.body.id}`).expect(200);
      expect(order.body).toMatchObject({ status: 'CANCELLED', paymentStatus: 'FAILED' });
      expect((await prisma.promocode.findUniqueOrThrow({ where: { code: 'FORMO10' } })).usedCount).toBe(0);
      await as(user).post(`/api/orders/${res.body.id}/payment/confirm`).expect(409);
    });

    it("slot to'lsa — 409, slotlar ro'yxatida band ko'rinadi", async () => {
      await as(admin)
        .put('/api/admin/settings/delivery.slots', { value: [{ start: '10:00', end: '14:00', cap: 3, on: true }] })
        .expect(200);
      // Ertaga 10:00-14:00 da allaqachon 2 ta faol buyurtma bor (bosilmoqda + naqd)
      await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'S' }).expect(201);
      await as(user).post('/api/orders/checkout', checkoutBody({ paymentMethod: 'CASH', promocode: undefined })).expect(201);

      const slots = await as(user).get('/api/checkout/delivery-slots?days=1').expect(200);
      expect(slots.body.days[0].slots).toEqual([expect.objectContaining({ slot: '10:00-14:00', remaining: 0, available: false })]);

      await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'S' }).expect(201);
      await as(user).post('/api/orders/checkout', checkoutBody({ paymentMethod: 'CASH', promocode: undefined })).expect(409);
      await as(user)
        .post('/api/orders/checkout', checkoutBody({ paymentMethod: 'CASH', promocode: undefined, deliveryDate: addDays(todayLocal(), 2) }))
        .expect(201);
    });

    it('yetkazish narxi sozlamadan olinadi', async () => {
      await as(admin).put('/api/admin/settings/delivery.fee', { value: 20000 }).expect(200);
      await as(user).post('/api/cart/items', { kitId: homeKit, shirtSize: 'S' }).expect(201);
      const cart = await as(user).get('/api/cart').expect(200);
      expect(cart.body.summary.delivery).toBe(20000);
    });

    it('savatdagi forma sotuvdan olinsa buyurtma berilmaydi', async () => {
      await as(admin).patch(`/api/admin/clubs/kits/${homeKit}`, { isActive: false }).expect(200);
      const cart = await as(user).get('/api/cart').expect(200);
      expect(cart.body.items[0]).toMatchObject({ available: false, problem: 'Forma sotuvda emas' });
      expect(cart.body.summary.subtotal).toBe(0);
      const res = await as(user)
        .post('/api/orders/checkout', checkoutBody({ paymentMethod: 'CASH', promocode: undefined, deliveryDate: addDays(todayLocal(), 2) }))
        .expect(400);
      expect(res.body.message).toMatch(/Savatni yangilang/);
      await as(admin).patch(`/api/admin/clubs/kits/${homeKit}`, { isActive: true }).expect(200);
    });

    it('admin buyurtmalar jurnalida mijoz amallari yoziladi', async () => {
      const logs = await prisma.auditLog.findMany({ where: { category: { in: ['ORDER', 'PAYMENT'] } } });
      const actions = logs.map((l) => l.action);
      expect(actions).toEqual(expect.arrayContaining(['Buyurtma berildi', "To'lov qabul qilindi", 'Buyurtma bekor qilindi']));
    });
  });

  // ---------------------------------------------------------------------------
  it("Swagger'da yangi bo'limlar bor", async () => {
    const res = await api(app).get('/api/docs-json').expect(200);
    const paths = Object.keys(res.body.paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/catalog/categories',
        '/api/catalog/clubs',
        '/api/catalog/clubs/{id}',
        '/api/catalog/kits/{id}',
        '/api/cart',
        '/api/cart/items',
        '/api/addresses',
        '/api/checkout/delivery-slots',
        '/api/orders/checkout',
        '/api/orders/{id}/payment/confirm',
        '/api/admin/categories',
      ]),
    );
  });
});
