import { INestApplication } from '@nestjs/common';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN } from './helpers';

/**
 * Mobil ilova: "Buyurtmani qabul qildim" tugmasi, push token va akkauntni o'chirish (Play Market / App Store talabi).
 */
describe('Buyurtmani qabul qilish, push token, akkauntni o‘chirish (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;

  const TOKEN = 'ExponentPushToken[e2e-device-1]';

  async function register(fullName: string) {
    const phone = nextPhone();
    const res = await api(app).post('/api/auth/register').send({ phone, password: 'secret123', fullName }).expect(201);
    return { token: res.body.accessToken as string, id: res.body.user.id as number, phone };
  }

  let seq = 0;
  const makeOrder = (customerId: number, status: OrderStatus) =>
    prisma.order.create({
      data: {
        code: `FRM-RCV-${Date.now()}-${(seq += 1)}`,
        customerId,
        customerName: 'Aziz',
        customerPhone: '+998900000000',
        size: 'L',
        totalSum: 159000,
        paymentMethod: PaymentMethod.CASH,
        status,
      },
    });

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    admin = (await login(app, SUPERADMIN.phone, SUPERADMIN.password)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('yetkazilayotgan buyurtma: mijoz "qabul qildim" bossa darhol DELIVERED bo‘ladi (admin shart emas)', async () => {
    const user = await register('Qabul Qiluvchi');
    const order = await makeOrder(user.id, OrderStatus.DELIVERING);

    const before = await api(app).get(`/api/orders/${order.id}`).set(bearer(user.token)).expect(200);
    expect(before.body).toMatchObject({ status: 'DELIVERING', canConfirmReceipt: true, receivedAt: null });

    const res = await api(app).post(`/api/orders/${order.id}/received`).set(bearer(user.token)).expect(200);
    expect(res.body).toMatchObject({ status: 'DELIVERED', canConfirmReceipt: false });
    expect(res.body.receivedAt).toBeTruthy();

    const log = await prisma.orderStatusLog.findFirstOrThrow({ where: { orderId: order.id }, orderBy: { id: 'desc' } });
    expect(log).toMatchObject({ fromStatus: 'DELIVERING', toStatus: 'DELIVERED', actorId: user.id });

    // Takroriy bosish xato bermaydi
    await api(app).post(`/api/orders/${order.id}/received`).set(bearer(user.token)).expect(200);
  });

  it('admin "yetkazildi" desa: mijozga push navbatga tushadi, mijoz tasdiqlaganda faqat vaqt yoziladi', async () => {
    const user = await register('Push Mijoz');
    await api(app)
      .post('/api/auth/me/push-token')
      .set(bearer(user.token))
      .send({ token: TOKEN, language: 'ru', platform: 'ios' })
      .expect(200);
    const order = await makeOrder(user.id, OrderStatus.DELIVERING);

    await api(app).patch(`/api/admin/orders/${order.id}/status`).set(bearer(admin)).send({ status: 'DELIVERED' }).expect(200);
    const queued = await prisma.pushOutbox.findMany({ where: { token: TOKEN } });
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ title: 'Вы получили заказ?', data: { type: 'order', orderId: order.id, status: 'DELIVERED' } });

    const view = await api(app).get(`/api/orders/${order.id}`).set(bearer(user.token)).expect(200);
    expect(view.body).toMatchObject({ status: 'DELIVERED', canConfirmReceipt: true });

    const res = await api(app).post(`/api/orders/${order.id}/received`).set(bearer(user.token)).expect(200);
    expect(res.body).toMatchObject({ status: 'DELIVERED', canConfirmReceipt: false });
    expect(res.body.receivedAt).toBeTruthy();
    // Mijozning o'z amali haqida push yuborilmaydi
    expect(await prisma.pushOutbox.count({ where: { token: TOKEN } })).toBe(1);

    await api(app).post('/api/auth/me/push-token/remove').set(bearer(user.token)).send({ token: TOKEN }).expect(200);
    expect(await prisma.pushToken.count({ where: { token: TOKEN } })).toBe(0);
  });

  it('yetkazishga chiqmagan yoki boshqaning buyurtmasi — tasdiqlab bo‘lmaydi', async () => {
    const user = await register('Erta Bosuvchi');
    const other = await register('Begona');
    const order = await makeOrder(user.id, OrderStatus.PRINTING);
    await api(app).post(`/api/orders/${order.id}/received`).set(bearer(user.token)).expect(409);
    await api(app).post(`/api/orders/${order.id}/received`).set(bearer(other.token)).expect(404);
    await api(app).post(`/api/orders/${order.id}/received`).expect(401);
  });

  it('noto‘g‘ri push token — 400', async () => {
    const user = await register('Token Xato');
    await api(app).post('/api/auth/me/push-token').set(bearer(user.token)).send({ token: 'not-a-token' }).expect(400);
  });

  it('akkauntni o‘chirish: faol buyurtma bo‘lsa 409, keyin shaxsiy ma’lumot o‘chadi, buyurtma tarixi qoladi', async () => {
    const user = await register('Ochiriladigan Mijoz');
    await api(app)
      .post('/api/addresses')
      .set(bearer(user.token))
      .send({ label: 'Uy', address: 'Yunusobod, Amir Temur 108', latitude: 41.31, longitude: 69.28 })
      .expect(201);
    const active = await makeOrder(user.id, OrderStatus.DELIVERING);

    await api(app).delete('/api/auth/me').set(bearer(user.token)).expect(409);

    await prisma.order.update({ where: { id: active.id }, data: { status: OrderStatus.DELIVERED } });
    await api(app).delete('/api/auth/me').set(bearer(user.token)).expect(200);

    // Sessiya yopildi, telefon bo'shadi, profil anonim; buyurtma saqlanadi
    await api(app).get('/api/auth/me').set(bearer(user.token)).expect(401);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row).toMatchObject({ isActive: false, fullName: 'O‘chirilgan foydalanuvchi', avatarUrl: null });
    expect(row.phone).not.toBe(user.phone);
    expect(await prisma.address.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.order.count({ where: { id: active.id, customerId: user.id } })).toBe(1);

    // Shu raqam bilan yangi hisob ochish mumkin
    await api(app).post('/api/auth/register').send({ phone: user.phone, password: 'secret123', fullName: 'Yangi Hisob' }).expect(201);
  });

  it('xodim hisobini ilovadan o‘chirib bo‘lmaydi', async () => {
    await api(app).delete('/api/auth/me').set(bearer(admin)).expect(403);
  });
});
