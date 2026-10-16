import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { addDays, todayLocal } from '../src/shop/delivery.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN } from './helpers';

/**
 * Buyurtma oqimi: mobil ilova → operator/superadmin (NEW) → tikuv sexiga yuborish (SENT_TO_WORKSHOP) →
 * sex tasdiqlaydi (ACCEPTED) → PRINTING → READY → DELIVERING → operator DELIVERED.
 */
describe('Buyurtma oqimi: operator → tikuv sexi (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let operator: string;
  let user: string;
  let sexA: { token: string; id: number };
  let sexB: { token: string; id: number };
  let kitId: number;
  let addressId: number;

  const as = (token: string) => ({
    get: (url: string) => api(app).get(url).set(bearer(token)),
    post: (url: string, body?: object) => api(app).post(url).set(bearer(token)).send(body),
    patch: (url: string, body?: object) => api(app).patch(url).set(bearer(token)).send(body),
  });

  async function workshop(workshopName: string) {
    const phone = nextPhone();
    const res = await as(admin)
      .post('/api/admin/workshops', { phone, password: 'tailor123', fullName: `${workshopName} rahbari`, workshopName })
      .expect(201);
    return { token: (await login(app, phone, 'tailor123')).accessToken, id: res.body.id as number };
  }

  async function placeOrder() {
    await as(user).post('/api/cart/items', { kitId, shirtSize: 'M' }).expect(201);
    const res = await as(user)
      .post('/api/orders/checkout', {
        addressId,
        deliveryDate: addDays(todayLocal(), 1),
        deliverySlot: '10:00-14:00',
        paymentMethod: 'CASH',
      })
      .expect(201);
    return res.body.id as number;
  }

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Category", "Club", "Kit", "Promocode", "Setting", "AuditLog" RESTART IDENTITY CASCADE',
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

  let orderId: number;

  it('mobil ilovadan kelgan buyurtma operator va superadminga NEW bo‘lib tushadi', async () => {
    orderId = await placeOrder();
    for (const token of [operator, admin]) {
      const res = await as(token).get('/api/admin/orders?status=NEW').expect(200);
      expect(res.body.items.map((o: { id: number }) => o.id)).toContain(orderId);
      expect(res.body.byStatus.NEW).toBe(1);
    }
    const detail = await as(operator).get(`/api/admin/orders/${orderId}`).expect(200);
    expect(detail.body).toMatchObject({ status: 'NEW', workshop: null });
    expect(detail.body.statusLogs).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'NEW', actorName: 'Aziz Karimov', actorRole: 'Foydalanuvchi' }),
    ]);
  });

  it('sex hali biriktirilmagan buyurtmani ko‘rmaydi va boshqara olmaydi', async () => {
    await as(sexA.token).get(`/api/workshop/orders/${orderId}`).expect(404);
    await as(sexA.token).post(`/api/workshop/orders/${orderId}/accept`).expect(404);
  });

  it('rollar: USER va TAILOR sexga yubora olmaydi, operator sex endpointlariga kira olmaydi', async () => {
    await as(user).post(`/api/admin/orders/${orderId}/assign`, { workshopId: sexA.id }).expect(403);
    await as(sexA.token).post(`/api/admin/orders/${orderId}/assign`, { workshopId: sexA.id }).expect(403);
    await as(operator).get('/api/workshop/orders').expect(403);
  });

  it('noto‘g‘ri sex: mavjud bo‘lmagan, TAILOR bo‘lmagan yoki bloklangan — 400', async () => {
    await as(operator).post(`/api/admin/orders/${orderId}/assign`, { workshopId: 99999 }).expect(400);
    const notTailor = await prisma.user.findFirstOrThrow({ where: { role: 'USER' } });
    await as(operator).post(`/api/admin/orders/${orderId}/assign`, { workshopId: notTailor.id }).expect(400);
    await as(admin).patch(`/api/admin/workshops/${sexB.id}`, { isActive: false }).expect(200);
    await as(operator).post(`/api/admin/orders/${orderId}/assign`, { workshopId: sexB.id }).expect(400);
    await as(admin).patch(`/api/admin/workshops/${sexB.id}`, { isActive: true }).expect(200);
    sexB.token = (await login(app, (await prisma.user.findUniqueOrThrow({ where: { id: sexB.id } })).phone, 'tailor123')).accessToken;
  });

  it('operator sexga yuboradi → SENT_TO_WORKSHOP, mijozda "Sexga yuborildi"', async () => {
    const res = await as(operator)
      .post(`/api/admin/orders/${orderId}/assign`, { workshopId: sexA.id, note: 'Ertaga tayyor bo‘lsin' })
      .expect(200);
    expect(res.body).toMatchObject({ status: 'SENT_TO_WORKSHOP', workshop: { id: sexA.id } });
    expect(res.body.statusLogs.at(-1)).toMatchObject({ toStatus: 'SENT_TO_WORKSHOP', note: 'Ertaga tayyor bo‘lsin', actorRole: 'Operator' });

    const mine = await as(user).get(`/api/orders/${orderId}`).expect(200);
    expect(mine.body).toMatchObject({ status: 'SENT_TO_WORKSHOP', statusLabel: 'Sexga yuborildi', canCancel: true });
  });

  it('sex o‘z ro‘yxatida ko‘radi; boshqa sex ko‘rmaydi', async () => {
    const res = await as(sexA.token).get('/api/workshop/orders?status=SENT_TO_WORKSHOP').expect(200);
    expect(res.body).toMatchObject({ total: 1, byStatus: { SENT_TO_WORKSHOP: 1 } });
    expect(res.body.items[0]).toMatchObject({ id: orderId, customerName: 'Aziz Karimov', deliveryAddress: 'Yunusobod 4' });
    expect(res.body.items[0]).not.toHaveProperty('totalSum');
    expect((await as(sexB.token).get('/api/workshop/orders').expect(200)).body.total).toBe(0);
    await as(sexB.token).post(`/api/workshop/orders/${orderId}/accept`).expect(404);
  });

  it('tasdiqlanmagan buyurtmani bosishga o‘tkazib bo‘lmaydi', async () => {
    await as(sexA.token).patch(`/api/workshop/orders/${orderId}/status`, { status: 'PRINTING' }).expect(409);
  });

  it('sex rad etadi → operatorga NEW bo‘lib qaytadi, keyin boshqa sexga yuboriladi', async () => {
    await as(sexA.token).post(`/api/workshop/orders/${orderId}/reject`, {}).expect(400);
    const res = await as(sexA.token)
      .post(`/api/workshop/orders/${orderId}/reject`, { reason: 'Mato tugagan' })
      .expect(200);
    expect(res.body).toMatchObject({ id: orderId, status: 'NEW' });
    await as(sexA.token).get(`/api/workshop/orders/${orderId}`).expect(404);

    const detail = await as(operator).get(`/api/admin/orders/${orderId}`).expect(200);
    expect(detail.body).toMatchObject({ status: 'NEW', workshop: null });
    expect(detail.body.statusLogs.at(-1)).toMatchObject({ toStatus: 'NEW', note: 'Sex rad etdi: Mato tugagan' });

    await as(operator).post(`/api/admin/orders/${orderId}/assign`, { workshopId: sexB.id }).expect(200);
  });

  it('sex tasdiqlaydi → ACCEPTED; endi qayta yuborish va mijoz bekor qilishi — 409', async () => {
    const res = await as(sexB.token).post(`/api/workshop/orders/${orderId}/accept`).expect(200);
    expect(res.body.status).toBe('ACCEPTED');
    await as(sexB.token).post(`/api/workshop/orders/${orderId}/accept`).expect(409);
    await as(sexB.token).post(`/api/workshop/orders/${orderId}/reject`, { reason: 'kech' }).expect(409);
    await as(operator).post(`/api/admin/orders/${orderId}/assign`, { workshopId: sexA.id }).expect(409);
    await as(user).post(`/api/orders/${orderId}/cancel`).expect(409);
  });

  it('sex holatni oldinga suradi: bosilmoqda → tayyor → yetkazishga berildi', async () => {
    const path = `/api/workshop/orders/${orderId}/status`;
    // READY dan oldin yetkazishga berib bo'lmaydi; sex DELIVERED/CANCELLED qo'ya olmaydi
    await as(sexB.token).patch(path, { status: 'DELIVERING' }).expect(409);
    await as(sexB.token).patch(path, { status: 'DELIVERED' }).expect(400);
    await as(sexB.token).patch(path, { status: 'CANCELLED' }).expect(400);

    await as(sexB.token).patch(path, { status: 'PRINTING' }).expect(200);
    await as(sexB.token).patch(path, { status: 'PRINTING' }).expect(409); // orqaga/joyida emas
    const ready = await as(sexB.token).patch(path, { status: 'READY', note: 'Qadoqlandi' }).expect(200);
    expect(ready.body.status).toBe('READY');
    await as(sexB.token).patch(path, { status: 'QUALITY_CHECK' }).expect(409);

    const mine = await as(user).get(`/api/orders/${orderId}`).expect(200);
    expect(mine.body).toMatchObject({ status: 'READY', statusLabel: 'Tayyor' });

    const delivering = await as(sexB.token).patch(path, { status: 'DELIVERING' }).expect(200);
    expect(delivering.body.status).toBe('DELIVERING');
    expect(delivering.body.statusLogs.map((l: { toStatus: string }) => l.toStatus)).toEqual([
      'NEW',
      'SENT_TO_WORKSHOP',
      'NEW',
      'SENT_TO_WORKSHOP',
      'ACCEPTED',
      'PRINTING',
      'READY',
      'DELIVERING',
    ]);
  });

  it('operator yetkazildi deb yopadi; mijoz timeline va vaqtlarni ko‘radi', async () => {
    await as(operator).patch(`/api/admin/orders/${orderId}/status`, { status: 'DELIVERED' }).expect(200);
    const mine = await as(user).get(`/api/orders/${orderId}`).expect(200);
    expect(mine.body.status).toBe('DELIVERED');
    const skipped = mine.body.timeline.find((s: { status: string }) => s.status === 'QUALITY_CHECK');
    expect(skipped).toMatchObject({ done: true, at: null }); // sex bu bosqichni o'tkazib yubordi
    expect(mine.body.timeline.at(-1)).toMatchObject({ status: 'DELIVERED', current: true });
    expect(mine.body.timeline.at(-1).at).toBeTruthy();

    await as(sexB.token).patch(`/api/workshop/orders/${orderId}/status`, { status: 'DELIVERING' }).expect(409);
  });

  it('mijoz sexga yuborilgan (hali tasdiqlanmagan) buyurtmani bekor qila oladi — sexda CANCELLED ko‘rinadi', async () => {
    const id = await placeOrder();
    await as(operator).post(`/api/admin/orders/${id}/assign`, { workshopId: sexA.id }).expect(200);
    await as(user).post(`/api/orders/${id}/cancel`).expect(200);
    const res = await as(sexA.token).get(`/api/workshop/orders/${id}`).expect(200);
    expect(res.body.status).toBe('CANCELLED');
    await as(sexA.token).post(`/api/workshop/orders/${id}/accept`).expect(409);
  });

  it('har o‘tish audit jurnaliga yoziladi', async () => {
    const res = await as(admin).get('/api/admin/audit-log?search=Sex').expect(200);
    const actions = res.body.items.map((i: { action: string }) => i.action);
    expect(actions).toEqual(
      expect.arrayContaining(['Sex buyurtmani qabul qildi', 'Sex buyurtmani rad etdi', 'Sex: yetkazishga berildi']),
    );
  });
});
