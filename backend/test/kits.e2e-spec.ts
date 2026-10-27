import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { addDays, todayLocal } from '../src/shop/delivery.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN, XSS_PAYLOADS } from './helpers';

// 1×1 shaffof PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * 3D formalar: Superadmin dizayn yasaydi → nashr qiladi → mobil ilova ko'radi →
 * mijoz ism/raqam/o'lcham bilan savatga qo'shadi → buyurtma → admin buyurtmada dizayn nusxasini ko'radi.
 */
describe('3D forma dizaynlari (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let user: string;
  let designId: number;
  let draftId: number;

  const as = (token: string) => ({
    get: (url: string) => api(app).get(url).set(bearer(token)),
    post: (url: string, body?: object) => api(app).post(url).set(bearer(token)).send(body),
    patch: (url: string, body?: object) => api(app).patch(url).set(bearer(token)).send(body),
    delete: (url: string) => api(app).delete(url).set(bearer(token)),
  });

  const design = (over = {}) => ({
    name: 'Oqim 2026',
    primaryColor: '#1f6f8b',
    secondaryColor: '#0b1d2a',
    textColor: '#e3c27a',
    pattern: 'fade',
    neck: 'round',
    sponsorText: 'KARVON',
    ...over,
  });

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await prisma.$executeRawUnsafe('TRUNCATE "KitDesign", "PricingItem", "Setting", "AuditLog" RESTART IDENTITY CASCADE');
    admin = (await login(app, SUPERADMIN.phone, SUPERADMIN.password)).accessToken;
    const res = await api(app).post('/api/auth/register').send({ phone: nextPhone(), password: 'secret123', fullName: 'Aziz Karimov' });
    user = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Admin yo\'llari faqat SUPERADMIN uchun', () => {
    it.each([
      ['get', '/api/admin/kit-designs'],
      ['post', '/api/admin/kit-designs'],
      ['patch', '/api/admin/kit-designs/1'],
      ['delete', '/api/admin/kit-designs/1'],
      ['post', '/api/admin/kit-designs/uploads?kind=crest'],
    ] as const)('%s %s: tokensiz 401, mijoz 403', async (method, url) => {
      await api(app)[method](url).expect(401);
      await api(app)[method](url).set(bearer(user)).expect(403);
    });

    it('thumbnail: tokensiz 401, mijoz 403', async () => {
      await api(app).put('/api/admin/kit-designs/1/thumbnail').expect(401);
      await api(app).put('/api/admin/kit-designs/1/thumbnail').set(bearer(user)).expect(403);
    });
  });

  describe('Admin CRUD', () => {
    it('yangi dizayn — qoralama, v1 shaklida qaytadi', async () => {
      const res = await as(admin).post('/api/admin/kit-designs', { design: design(), sortOrder: 2 }).expect(201);
      designId = res.body.id;
      expect(res.body).toMatchObject({
        isActive: false,
        sortOrder: 2,
        thumbnailUrl: null,
        design: { designVersion: 1, name: 'Oqim 2026', pattern: 'fade', neck: 'round', sponsorText: 'KARVON', backTopText: '' },
      });
      const draft = await as(admin).post('/api/admin/kit-designs', { design: design({ name: 'Qoralama', pattern: 'hoops' }) }).expect(201);
      draftId = draft.body.id;
    });

    it("noto'g'ri rang/naqsh, XSS, begona rasm manzili — 400", async () => {
      await as(admin).post('/api/admin/kit-designs', { design: design({ primaryColor: 'red' }) }).expect(400);
      await as(admin).post('/api/admin/kit-designs', { design: design({ pattern: 'zigzag' }) }).expect(400);
      await as(admin).post('/api/admin/kit-designs', { design: design({ name: XSS_PAYLOADS[0] }) }).expect(400);
      await as(admin)
        .post('/api/admin/kit-designs', { design: design({ crestImageUrl: 'https://evil.example/crest.png' }) })
        .expect(400);
    });

    it('rasm yuklash: PNG qabul qilinadi, PNG nomli SVG rad etiladi; URL dizaynga qo\'yiladi', async () => {
      const ok = await api(app)
        .post('/api/admin/kit-designs/uploads?kind=crest')
        .set(bearer(admin))
        .attach('file', PNG, { filename: 'crest.png', contentType: 'image/png' })
        .expect(201);
      expect(ok.body.url).toMatch(/^\/api\/uploads\/kits\/crest\/[0-9a-f-]{36}\.png$/);

      await api(app)
        .post('/api/admin/kit-designs/uploads?kind=crest')
        .set(bearer(admin))
        .attach('file', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'x.png', contentType: 'image/png' })
        .expect(400);
      await api(app).post('/api/admin/kit-designs/uploads?kind=crest').set(bearer(admin)).expect(400);

      // Yuklangan fayl ochiq va boshqa origin'dan o'qiladi (admin canvas, mobil WebView)
      const file = await api(app).get(ok.body.url).expect(200);
      expect(file.headers['content-type']).toBe('image/png');
      expect(file.headers['cross-origin-resource-policy']).toBe('cross-origin');

      const res = await as(admin).patch(`/api/admin/kit-designs/${designId}`, { design: design({ crestImageUrl: ok.body.url }) }).expect(200);
      expect(res.body.design.crestImageUrl).toBe(ok.body.url);
    });

    it("katta fayl — 413", async () => {
      await api(app)
        .post('/api/admin/kit-designs/uploads?kind=sponsor')
        .set(bearer(admin))
        .attach('file', Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]), { filename: 'big.png' })
        .expect(413);
    });

    it("kichik rasm (thumbnail) faqat PNG; ro'yxatda ko'rinadi", async () => {
      const res = await api(app)
        .put(`/api/admin/kit-designs/${designId}/thumbnail`)
        .set(bearer(admin))
        .attach('file', PNG, { filename: 'thumb.png' })
        .expect(200);
      expect(res.body.thumbnailUrl).toMatch(/\/kits\/thumb\/.+\.png$/);
      const list = await as(admin).get('/api/admin/kit-designs').expect(200);
      expect(list.body.map((d: { id: number }) => d.id)).toEqual([draftId, designId]); // tartib: sortOrder 0, keyin 2
    });
  });

  describe('Mobil: faqat nashr qilinganlar', () => {
    it("nashr qilinmagan dizayn ochiq ro'yxatda yo'q, id bilan ham 404", async () => {
      const res = await api(app).get('/api/kits/designs').expect(200);
      expect(res.body).toEqual([]);
      await api(app).get(`/api/kits/designs/${designId}`).expect(404);
    });

    it("nashr qilingach tokensiz ko'rinadi: v1 dizayn va server narxi", async () => {
      await as(admin).patch(`/api/admin/kit-designs/${designId}`, { isActive: true }).expect(200);
      const res = await api(app).get('/api/kits/designs').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: designId,
        name: 'Oqim 2026',
        design: { designVersion: 1, primaryColor: '#1f6f8b', pattern: 'fade' },
        prices: { shirt: 99000, shorts: 60000, print: 30000 },
      });
      expect(res.body[0]).not.toHaveProperty('isActive');
      await api(app).get(`/api/kits/designs/${designId}`).expect(200);
      await api(app).get(`/api/kits/designs/${draftId}`).expect(404);
    });
  });

  describe('Buyurtma: mavjud savat → checkout oqimi', () => {
    let addressId: number;

    it("savatga qo'shish: narx serverda (futbolka + bosma), ism/raqam/o'lcham saqlanadi", async () => {
      const res = await as(user)
        .post('/api/cart/items', { kitDesignId: designId, shirtSize: 'L', printName: 'Rahimov', printNumber: '10', unitPrice: 1 })
        .expect(400); // narx yuborib bo'lmaydi
      expect(res.body.message).toBeDefined();

      const cart = await as(user).post('/api/cart/items', { kitDesignId: designId, shirtSize: 'l', printName: 'Rahimov', printNumber: '10' }).expect(201);
      expect(cart.body.items[0]).toMatchObject({
        kitDesignId: designId,
        kitDesign: { id: designId, design: { designVersion: 1, pattern: 'fade' } },
        title: 'Oqim 2026 · 3D dizayn',
        printName: 'RAHIMOV',
        printNumber: '10',
        shirtSize: 'L',
        withShorts: false,
        unitPrice: 129000,
        available: true,
      });
    });

    it("qoralama dizayn, noto'g'ri raqam/ism/o'lcham, ikki xil mahsulot birga — rad etiladi", async () => {
      await as(user).post('/api/cart/items', { kitDesignId: draftId, shirtSize: 'L' }).expect(404);
      await as(user).post('/api/cart/items', { kitDesignId: designId, shirtSize: 'L', printNumber: '100' }).expect(400);
      await as(user).post('/api/cart/items', { kitDesignId: designId, shirtSize: 'L', printName: 'ABCDEFGHIJKLM' }).expect(400);
      await as(user).post('/api/cart/items', { kitDesignId: designId, shirtSize: 'XS' }).expect(400);
      await as(user).post('/api/cart/items', { kitDesignId: designId, kitId: 1, shirtSize: 'L' }).expect(400);
    });

    it("buyurtma: KIT_DESIGN, OrderItem'da kitDesignId va dizayn nusxasi; admin ko'radi", async () => {
      const addr = await as(user).post('/api/addresses', { label: 'Uy', address: 'Yunusobod, Amir Temur 108' }).expect(201);
      addressId = addr.body.id;
      const order = await as(user)
        .post('/api/orders/checkout', {
          addressId,
          deliveryDate: addDays(todayLocal(), 1),
          deliverySlot: '10:00-14:00',
          paymentMethod: 'CASH',
        })
        .expect(201);
      expect(order.body.items[0]).toMatchObject({
        kitDesignId: designId,
        clubName: 'Oqim 2026',
        kitLabel: '3D dizayn',
        printName: 'RAHIMOV',
        printNumber: '10',
        shirtSize: 'L',
        unitPrice: 129000,
        designSnapshot: { designVersion: 1, name: 'Oqim 2026', primaryColor: '#1f6f8b', pattern: 'fade' },
      });

      const adminView = await as(admin).get(`/api/admin/orders/${order.body.id}`).expect(200);
      expect(adminView.body).toMatchObject({ productType: 'KIT_DESIGN', printName: 'RAHIMOV', printNumber: '10', size: 'L' });
      expect(adminView.body.items[0]).toMatchObject({ kitDesignId: designId, designSnapshot: { pattern: 'fade' } });
    });

    it("dizayn keyin o'zgartirilsa/o'chirilsa ham buyurtmadagi nusxa o'zgarmaydi", async () => {
      await as(admin).patch(`/api/admin/kit-designs/${designId}`, { design: design({ primaryColor: '#a3122b' }) }).expect(200);
      await as(admin).delete(`/api/admin/kit-designs/${designId}`).expect(200);
      const orders = await as(user).get('/api/orders').expect(200);
      const item = orders.body.items[0].items[0];
      expect(item.kitDesignId).toBeNull();
      expect(item.designSnapshot.primaryColor).toBe('#1f6f8b');
      await api(app).get('/api/kits/designs').expect(200, []);
    });
  });
});
