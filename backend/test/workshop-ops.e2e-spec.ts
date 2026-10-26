import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { addDays, todayLocal } from '../src/shop/delivery.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN } from './helpers';

/**
 * Operator ↔ tikuv sexi: yozishma, nuqson (brak), profil/xodimlar; Superadmin ↔ mobil: dizayn studiyasi,
 * kampaniya auditoriyasi, bildirishnoma holati; mobil profil.
 */
describe('Sex paneli, studiya va bildirishnomalar (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let operator: string;
  let user: string;
  let sexA: { token: string; id: number };
  let sexB: { token: string; id: number };
  let kitId: number;
  let addressId: number;
  let orderId: number;

  const as = (token: string) => ({
    get: (url: string) => api(app).get(url).set(bearer(token)),
    post: (url: string, body?: object) => api(app).post(url).set(bearer(token)).send(body),
    patch: (url: string, body?: object) => api(app).patch(url).set(bearer(token)).send(body),
    put: (url: string, body?: object) => api(app).put(url).set(bearer(token)).send(body),
    delete: (url: string) => api(app).delete(url).set(bearer(token)),
  });

  async function workshop(workshopName: string) {
    const phone = nextPhone();
    const res = await as(admin)
      .post('/api/admin/workshops', { phone, password: 'tailor123', fullName: `${workshopName} rahbari`, workshopName })
      .expect(201);
    return { token: (await login(app, phone, 'tailor123')).accessToken, id: res.body.id as number };
  }

  const checkout = (day: number) =>
    as(user).post('/api/orders/checkout', {
      addressId,
      deliveryDate: addDays(todayLocal(), day),
      deliverySlot: '10:00-14:00',
      paymentMethod: 'CASH',
    });

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Category", "Club", "Kit", "Promocode", "Setting", "AuditLog", "PricingItem", "Campaign" RESTART IDENTITY CASCADE',
    );
    admin = (await login(app, SUPERADMIN.phone, SUPERADMIN.password)).accessToken;
    const opPhone = nextPhone();
    await as(admin).post('/api/admin/operator', { phone: opPhone, password: 'operator123', fullName: 'Dilshod Operator' }).expect(201);
    operator = (await login(app, opPhone, 'operator123')).accessToken;
    sexA = await workshop('Ipak Yo‘li Tikuv');
    sexB = await workshop('Chilonzor Sex');

    const reg = await api(app)
      .post('/api/auth/register')
      .send({ phone: nextPhone(), password: 'secret123', fullName: 'Aziz Karimov' })
      .expect(201);
    user = reg.body.accessToken;

    const club = await prisma.club.create({
      data: {
        name: 'Barcelona',
        league: 'LaLiga',
        season: '2026/27',
        code: 'FCB',
        markColor: '#a50044',
        kits: { create: [{ label: 'Uy', bgColor: '#a50044', textColor: '#ffffff' }] },
      },
      include: { kits: true },
    });
    kitId = club.kits[0].id;
    addressId = (await as(user).post('/api/addresses', { label: 'Uy', address: 'Yunusobod 4' }).expect(201)).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  describe('Operator ↔ sex yozishmasi', () => {
    it('operator sexga yozadi, sex ko‘radi va o‘qilgan bo‘ladi; javob operatorga o‘qilmagan bo‘lib tushadi', async () => {
      await as(operator).post(`/api/admin/chat/${sexA.id}/messages`, { text: 'Bugun 20 ta forma kerak' }).expect(201);
      expect((await as(sexA.token).get('/api/workshop/chat/unread').expect(200)).body.unread).toBe(1);

      const seen = await as(sexA.token).get('/api/workshop/chat/messages').expect(200);
      expect(seen.body.items).toEqual([expect.objectContaining({ text: 'Bugun 20 ta forma kerak', fromWorkshop: false })]);
      expect((await as(sexA.token).get('/api/workshop/chat/unread').expect(200)).body.unread).toBe(0);

      const reply = await as(sexA.token).post('/api/workshop/chat/messages', { text: 'Tayyor bo‘ladi' }).expect(201);
      expect(reply.body).toMatchObject({ fromWorkshop: true, workshopId: sexA.id });

      const threads = await as(operator).get('/api/admin/chat/threads').expect(200);
      const a = threads.body.find((t: { workshopId: number }) => t.workshopId === sexA.id);
      expect(a).toMatchObject({ unread: 1, lastMessage: { text: 'Tayyor bo‘ladi', fromWorkshop: true } });
      expect(threads.body[0].workshopId).toBe(sexA.id); // oxirgi yozilgan birinchi
      const b = threads.body.find((t: { workshopId: number }) => t.workshopId === sexB.id);
      expect(b).toMatchObject({ unread: 0, lastMessage: null });
    });

    it('?after faqat yangi xabarlarni qaytaradi; operator ochganda sex xabarlari o‘qiladi', async () => {
      const all = await as(operator).get(`/api/admin/chat/${sexA.id}/messages`).expect(200);
      expect(all.body.items).toHaveLength(2);
      const lastId = all.body.items[1].id;
      await as(sexA.token).post('/api/workshop/chat/messages', { text: 'Yana bir xabar' }).expect(201);
      const fresh = await as(operator).get(`/api/admin/chat/${sexA.id}/messages?after=${lastId}`).expect(200);
      expect(fresh.body.items.map((m: { text: string }) => m.text)).toEqual(['Yana bir xabar']);
      const threads = await as(operator).get('/api/admin/chat/threads').expect(200);
      expect(threads.body.find((t: { workshopId: number }) => t.workshopId === sexA.id).unread).toBe(0);
    });

    it('sexlar bir-birining suhbatini ko‘rmaydi; rol va validatsiya', async () => {
      const b = await as(sexB.token).get('/api/workshop/chat/messages').expect(200);
      expect(b.body.items).toEqual([]);
      await as(user).get('/api/workshop/chat/messages').expect(403);
      await as(user).get('/api/admin/chat/threads').expect(403);
      await as(sexA.token).get('/api/admin/chat/threads').expect(403);
      await as(operator).post(`/api/admin/chat/${sexA.id}/messages`, { text: '   ' }).expect(400);
      await as(operator).post(`/api/admin/chat/${sexA.id}/messages`, { text: '<script>alert(1)</script>' }).expect(400);
      await as(operator).post('/api/admin/chat/999999/messages', { text: 'salom' }).expect(404);
      // Saqlangan XSS: matnli maydonlar HTMLni qabul qilmaydi
      await as(sexA.token).post('/api/workshop/employees', { fullName: '<img src=x onerror=alert(1)>', role: 'Tikuvchi' }).expect(400);
      await as(sexA.token).patch('/api/workshop/profile', { address: 'javascript:alert(1)' }).expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Nuqson (brak)', () => {
    beforeAll(async () => {
      await as(user).post('/api/cart/items', { kitId, shirtSize: 'M' }).expect(201);
      orderId = (await checkout(1).expect(201)).body.id;
      await as(operator).post(`/api/admin/orders/${orderId}/assign`, { workshopId: sexA.id }).expect(200);
      await as(sexA.token).post(`/api/workshop/orders/${orderId}/accept`).expect(200);
    });

    it('sex faqat o‘z buyurtmasi bo‘yicha xabar bera oladi', async () => {
      await as(sexB.token).post('/api/workshop/defects', { orderId, reason: 'FABRIC' }).expect(404);
      await as(sexA.token).post('/api/workshop/defects', { orderId, reason: 'NOMA_LUM' }).expect(400);
      const res = await as(sexA.token)
        .post('/api/workshop/defects', { orderId, reason: 'PRINT_SHIFT', qty: 2, note: 'Bosma 2 sm siljigan' })
        .expect(201);
      expect(res.body).toMatchObject({ reason: 'PRINT_SHIFT', qty: 2, status: 'OPEN', workshopId: sexA.id });
      await as(user).post('/api/workshop/defects', { orderId, reason: 'FABRIC' }).expect(403);
    });

    it('operator ko‘radi (openCount), hal qiladi; sex o‘z ro‘yxatida ko‘radi', async () => {
      const list = await as(operator).get('/api/admin/defects?status=OPEN').expect(200);
      expect(list.body.openCount).toBe(1);
      expect(list.body.items[0]).toMatchObject({ reason: 'PRINT_SHIFT', order: { id: orderId } });
      const id = list.body.items[0].id;

      await as(sexA.token).patch(`/api/admin/defects/${id}/resolve`, {}).expect(403);
      const done = await as(operator).patch(`/api/admin/defects/${id}/resolve`, { note: 'Qayta bosildi' }).expect(200);
      expect(done.body).toMatchObject({ status: 'RESOLVED', resolvedNote: 'Qayta bosildi' });
      expect((await as(operator).get('/api/admin/defects').expect(200)).body.openCount).toBe(0);

      const mine = await as(sexA.token).get('/api/workshop/defects').expect(200);
      expect(mine.body.total).toBe(1);
      expect((await as(sexB.token).get('/api/workshop/defects').expect(200)).body.total).toBe(0);
      await as(operator).patch('/api/admin/defects/999999/resolve', {}).expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Sex profili va xodimlari', () => {
    it('profil yangilanadi; kunlik sig‘im sex tomonidan o‘zgarmaydi; vaqt formati tekshiriladi', async () => {
      await as(admin).patch(`/api/admin/workshops/${sexA.id}`, { isActive: true }).expect(200);
      await prisma.user.update({ where: { id: sexA.id }, data: { dailyCapacity: 40 } });
      const res = await as(sexA.token)
        .patch('/api/workshop/profile', { workshopName: 'Ipak Yo‘li', address: 'Chilonzor 7', shiftStart: '09:00', shiftEnd: '18:30' })
        .expect(200);
      expect(res.body).toMatchObject({ workshopName: 'Ipak Yo‘li', address: 'Chilonzor 7', shiftStart: '09:00', shiftEnd: '18:30', dailyCapacity: 40 });
      await as(sexA.token).patch('/api/workshop/profile', { shiftStart: '25:99' }).expect(400);
      await as(sexA.token).patch('/api/workshop/profile', { dailyCapacity: 999 }).expect(400); // whitelist: begona maydon rad etiladi
      expect((await as(sexA.token).get('/api/workshop/profile').expect(200)).body.dailyCapacity).toBe(40);
    });

    it('xodimlar CRUD faqat o‘z sexi ichida', async () => {
      const created = await as(sexA.token).post('/api/workshop/employees', { fullName: 'Gulnora Aliyeva', role: 'Tikuvchi', phone: '+998901234567' }).expect(201);
      const id = created.body.id;
      await as(sexA.token).post('/api/workshop/employees', { fullName: '', role: 'Tikuvchi' }).expect(400);
      const upd = await as(sexA.token).patch(`/api/workshop/employees/${id}`, { role: 'Usta' }).expect(200);
      expect(upd.body).toMatchObject({ fullName: 'Gulnora Aliyeva', role: 'Usta' });

      expect((await as(sexB.token).get('/api/workshop/employees').expect(200)).body).toEqual([]);
      await as(sexB.token).patch(`/api/workshop/employees/${id}`, { role: 'X' }).expect(404);
      await as(sexB.token).delete(`/api/workshop/employees/${id}`).expect(404);

      expect((await as(sexA.token).get('/api/workshop/employees').expect(200)).body).toHaveLength(1);
      await as(sexA.token).delete(`/api/workshop/employees/${id}`).expect(200);
      expect((await as(sexA.token).get('/api/workshop/employees').expect(200)).body).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Mobil profil', () => {
    it('PATCH /auth/me o‘lchamlarni saqlaydi va null bilan tozalaydi; noto‘g‘ri qiymat 400', async () => {
      const res = await as(user).patch('/api/auth/me', { gender: 'MALE', age: 28, height: 180, weight: 75 }).expect(200);
      expect(res.body).toMatchObject({ gender: 'MALE', age: 28, height: 180, weight: 75 });
      expect((await as(user).get('/api/auth/me').expect(200)).body).toMatchObject({ height: 180 });
      const cleared = await as(user).patch('/api/auth/me', { weight: null }).expect(200);
      expect(cleared.body.weight).toBeNull();
      expect(cleared.body.height).toBe(180);
      await as(user).patch('/api/auth/me', { height: 10 }).expect(400);
      // fullName qabul qilinadi (profilni to'ldirish, 7ada9d6), lekin HTML/qisqa qiymat, telefon va rol — yo'q
      expect((await as(user).patch('/api/auth/me', { fullName: 'Aziz Karimov' }).expect(200)).body.fullName).toBe('Aziz Karimov');
      await as(user).patch('/api/auth/me', { fullName: '<b>Hacker</b>' }).expect(400);
      await as(user).patch('/api/auth/me', { fullName: 'A' }).expect(400);
      await as(user).patch('/api/auth/me', { phone: '+998900000000' }).expect(400);
      await as(user).patch('/api/auth/me', { role: 'SUPERADMIN' }).expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Kampaniya auditoriyasi', () => {
    it('ORDERED / NO_ORDERS / CART mijoz holatiga qarab ko‘rinadi', async () => {
      const mk = (name: string, audience: string) =>
        as(admin).post('/api/admin/campaigns', { name, audience, channel: 'PUSH', message: 'Xabar', status: 'ACTIVE' }).expect(201);
      await mk('Hamma uchun', 'ALL');
      await mk('Buyurtma berganlar', 'ordered');
      await mk('Yangilar', 'NO_ORDERS');
      await mk('Savat', 'CART');
      await mk('Erkin matn', 'Savatda qoldirganlar · 7 kun');

      const titles = async (token: string) =>
        (await as(token).get('/api/notifications').expect(200)).body.items.map((n: { title: string }) => n.title).sort();

      // Aziz buyurtma bergan, savati bo'sh
      expect(await titles(user)).toEqual(['Buyurtma berganlar', 'Erkin matn', 'Hamma uchun']);

      const fresh = (
        await api(app).post('/api/auth/register').send({ phone: nextPhone(), password: 'secret123', fullName: 'Yangi Mijoz' }).expect(201)
      ).body.accessToken;
      expect(await titles(fresh)).toEqual(['Erkin matn', 'Hamma uchun', 'Yangilar']);
      await as(fresh).post('/api/cart/items', { kitId, shirtSize: 'M' }).expect(201);
      expect(await titles(fresh)).toEqual(['Erkin matn', 'Hamma uchun', 'Savat', 'Yangilar']);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Dizayn studiyasi → savat → buyurtma → sex', () => {
    const design = { color: { type: 'solid', id: 'lojuvard' }, font: 'sport', patch: null, package: 'oddiy-paket' };

    beforeEach(async () => {
      await as(user).delete('/api/cart');
    });

    it('/app/config studiya variantlari va narxlarini beradi (yoqilganlar)', async () => {
      const res = await api(app).get('/api/app/config').expect(200);
      expect(res.body.studio.prices).toEqual({ custom: 129000, gradient: 30000, patch: 10000, gift: 15000, shorts: 60000 });
      expect(res.body.studio.textColors).toContain('oltin');
      expect(res.body.studio.textEffects).toEqual(['none', 'neon']);
      expect(res.body.studio.colors.solid).toContain('lojuvard');
      expect(res.body.studio.colors.custom).toBe(true);
      expect(res.body.studio.fonts).toEqual(['sport', 'klassik', 'oddiy']);

      // Superadmin "Narxlar" va "Dizayn studiyasi" sozlamalari o'zgarsa — mobil ham o'zgaradi
      await as(admin).put('/api/admin/pricing', { items: [{ key: 'studio.custom', section: 'Dizayn studiyasi', step: 2, label: "O'z dizayni", sub: '-', price: 150000 }] }).expect(200);
      await as(admin).put('/api/admin/settings/studio.config', { value: { fontToggles: { klassik: false }, solidToggles: { qizil: false } } }).expect(200);
      const changed = await api(app).get('/api/app/config').expect(200);
      expect(changed.body.studio.prices.custom).toBe(150000);
      expect(changed.body.studio.fonts).toEqual(['sport', 'oddiy']);
      expect(changed.body.studio.colors.solid).not.toContain('qizil');
    });

    it('maxsus futbolka narxi: asosiy + gradient + yamoq + sovg‘a qutisi (ism+raqam ichida)', async () => {
      const base = await as(user).post('/api/cart/items', { design, shirtSize: 'L', printName: 'Samir', printNumber: '7' }).expect(201);
      expect(base.body.items[0]).toMatchObject({
        kitId: null, club: null, kit: null, title: 'Maxsus dizayn futbolka', unitPrice: 150000, available: true, withShorts: false,
      });
      expect(base.body.items[0].design).toMatchObject({ color: { type: 'solid', id: 'lojuvard' }, font: 'sport', package: 'oddiy-paket' });

      // Aynan shu sozlama — son oshadi
      const again = await as(user).post('/api/cart/items', { design, shirtSize: 'L', printName: 'Samir', printNumber: '7' }).expect(201);
      expect(again.body.items).toHaveLength(1);
      expect(again.body.items[0].quantity).toBe(2);

      const fancy = await as(user)
        .post('/api/cart/items', {
          design: { color: { type: 'custom', hex: '#7A4FD1' }, font: 'oddiy', patch: 'kapitan', package: 'sovga-qutisi' },
          shirtSize: 'M',
        })
        .expect(201);
      const line = fancy.body.items.find((i: { quantity: number }) => i.quantity === 1);
      expect(line.unitPrice).toBe(150000 + 30000 + 10000 + 15000);
      expect(line.design.color).toEqual({ type: 'custom', hex: '#7a4fd1' });
    });

    it('noto‘g‘ri yoki o‘chirilgan tanlov, ikkalasi birga, ikkalasi yo‘q — 400', async () => {
      const bad = (d: object) => as(user).post('/api/cart/items', { design: d, shirtSize: 'M' }).expect(400);
      await bad({ ...design, color: { type: 'solid', id: 'qizil' } }); // Superadmin o'chirgan
      await bad({ ...design, color: { type: 'solid', id: 'yo_q' } });
      await bad({ ...design, color: { type: 'custom', hex: 'qizil' } });
      await bad({ ...design, font: 'klassik' }); // o'chirilgan
      await bad({ ...design, patch: 'noma_lum' });
      await bad({ ...design, package: 'noma_lum' });
      await as(user).post('/api/cart/items', { design: 'matn', shirtSize: 'M' }).expect(400);
      await as(user).post('/api/cart/items', { kitId, design, shirtSize: 'M' }).expect(400);
      await as(user).post('/api/cart/items', { shirtSize: 'M' }).expect(400);
    });

    it('buyurtma CUSTOM_DESIGN bo‘lib tushadi, narx hisoblanadi, sex dizaynni ko‘radi', async () => {
      await as(user).post('/api/cart/items', { design: { ...design, patch: 'bayroq' }, shirtSize: 'XL', printName: 'Ali', printNumber: '9' }).expect(201);
      await as(user).post('/api/cart/items', { kitId, shirtSize: 'M' }).expect(201); // aralash savat
      const res = await checkout(2).expect(201);
      expect(res.body.summary.subtotal).toBe(150000 + 10000 + (99000 + 60000 + 0));
      const id = res.body.id;

      const detail = await as(operator).get(`/api/admin/orders/${id}`).expect(200);
      expect(detail.body.items).toHaveLength(2);
      const custom = detail.body.items.find((i: { kitId: number | null }) => i.kitId === null);
      expect(custom).toMatchObject({ clubName: 'Maxsus dizayn', unitPrice: 160000, shirtSize: 'XL' });
      expect(custom.kitLabel).toContain('lojuvard');
      expect(custom.design).toMatchObject({ patch: 'bayroq' });
      expect(detail.body.productType).toBe('CUSTOM_DESIGN');

      await as(operator).post(`/api/admin/orders/${id}/assign`, { workshopId: sexB.id }).expect(200);
      const forWorkshop = await as(sexB.token).get(`/api/workshop/orders/${id}`).expect(200);
      expect(forWorkshop.body.items.find((i: { kitId: number | null }) => i.kitId === null).design).toMatchObject({ font: 'sport' });
      // mijoz o'z buyurtmasini ko'radi
      const mine = await as(user).get(`/api/orders/${id}`).expect(200);
      expect(mine.body.items.some((i: { design: unknown }) => i.design)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Telegram bildirishnomalari', () => {
    it('token sozlanmagan bo‘lsa holat va sinov xabari buni aytadi; buyurtma baribir ishlaydi', async () => {
      expect((await as(admin).get('/api/admin/settings/notifications/status').expect(200)).body).toEqual({ telegramConfigured: false });
      const test = await as(admin).post('/api/admin/settings/notifications/test').expect(200);
      expect(test.body).toMatchObject({ sent: false });
      expect(test.body.reason).toContain('TELEGRAM_BOT_TOKEN');
      await as(operator).get('/api/admin/settings/notifications/status').expect(403);

      await as(admin).put('/api/admin/settings/admin.notifications', { value: { newOrder: true, telegramChatId: '123' } }).expect(200);
      await as(user).post('/api/cart/items', { kitId, shirtSize: 'S' }).expect(201);
      await checkout(3).expect(201);
      await as(admin).put('/api/admin/inventory', { items: [{ productType: 'TSHIRT', color: 'Oq', size: 'M', qty: 1 }] }).expect(200);
    });
  });
});
