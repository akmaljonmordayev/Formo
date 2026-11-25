import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN } from './helpers';

describe('Balans va to‘lovlar (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await prisma.$executeRawUnsafe('TRUNCATE "TopUp", "BalanceTransaction" RESTART IDENTITY CASCADE');
    adminToken = (await login(app, SUPERADMIN.phone, SUPERADMIN.password)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('balans tarixi o‘qiladi, lekin yangi balans to‘ldirish endpointlari mavjud emas', async () => {
    const phone = nextPhone();
    const registered = await api(app)
      .post('/api/auth/register')
      .send({ phone, password: 'secret123', fullName: 'Balans Mijoz' })
      .expect(201);
    const token = registered.body.accessToken as string;
    const userId = registered.body.user.id as number;

    await prisma.user.update({ where: { id: userId }, data: { balance: 125000 } });
    const summary = await api(app).get('/api/wallet').set(bearer(token)).expect(200);
    expect(summary.body.balance).toBe(125000);

    await api(app).post('/api/wallet/topups').set(bearer(token)).send({ amount: 50000, method: 'MANUAL_CARD' }).expect(404);
    await api(app).get('/api/wallet/topup-methods').set(bearer(token)).expect(404);
    await api(app).get('/api/admin/topups').set(bearer(adminToken)).expect(404);
    await api(app).post('/api/internal/telegram/topups/receipt').send({}).expect(404);
  });

  it('Click/Payme balans callbacklari olib tashlangan', async () => {
    await api(app).post('/api/payments/click/prepare').send({}).expect(404);
    await api(app).post('/api/payments/click/complete').send({}).expect(404);
    await api(app).post('/api/payments/payme').send({}).expect(404);
  });
});
