import { INestApplication } from '@nestjs/common';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN } from './helpers';

/**
 * Eng ko'p sotilgan formalar (bosh sahifa) va formalar bo'yicha sevimlilar (yurakcha).
 * Klub/forma/buyurtmalar to'g'ridan-to'g'ri bazaga yoziladi — faqat shu fayl klublari tekshiriladi.
 */
describe('Formalar: eng ko‘p sotilgan va sevimlilar (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: string;
  let other: string;
  let admin: string;
  const tag = `BS${Date.now() % 100000}`;
  const kits: Record<string, number> = {};
  let orderSeq = 0;

  async function club(name: string, kitLabels: string[], kit360Id?: string) {
    const c = await prisma.club.create({
      data: { name: `${tag} ${name}`, league: 'Test', season: '2026', code: name.slice(0, 3).toUpperCase(), markColor: '#000000', kit360Id },
    });
    for (const [i, label] of kitLabels.entries()) {
      const k = await prisma.kit.create({ data: { clubId: c.id, label, bgColor: '#fff', textColor: '#000', sortOrder: i } });
      kits[`${name}:${label}`] = k.id;
    }
    return c;
  }

  async function sell(kitKey: string, quantity: number, status: OrderStatus = OrderStatus.NEW) {
    orderSeq += 1;
    await prisma.order.create({
      data: {
        code: `${tag}-${orderSeq}`,
        customerName: 'Test',
        customerPhone: '+998900000000',
        size: 'M',
        totalSum: 1000,
        paymentMethod: PaymentMethod.CASH,
        status,
        items: {
          create: [{ kitId: kits[kitKey], clubName: 'x', kitLabel: 'x', shirtSize: 'M', quantity, unitPrice: 1, totalPrice: quantity }],
        },
      },
    });
  }

  const register = async () =>
    (await api(app).post('/api/auth/register').send({ phone: nextPhone(), password: 'secret123', fullName: 'Forma Mijoz' }).expect(201)).body
      .accessToken as string;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    admin = (await login(app, SUPERADMIN.phone, SUPERADMIN.password)).accessToken;
    user = await register();
    other = await register();
    // Forma 360° id'si unikal — oldingi yugurishlardan qolgan bo'lsa bo'shatiladi
    await prisma.club.updateMany({ where: { kit360Id: 'mci' }, data: { kit360Id: null } });

    await club('Alfa', ['Uy', 'Mehmon']);
    await club('Beta', ['Uy']);
    await club('Gamma', ['Uy', 'Mehmon'], 'mci');

    await sell('Beta:Uy', 5);
    await sell('Alfa:Mehmon', 2);
    await sell('Alfa:Mehmon', 1, OrderStatus.DELIVERED);
    await sell('Alfa:Uy', 50, OrderStatus.CANCELLED); // bekor — sanalmaydi
    await sell('Alfa:Uy', 40, OrderStatus.PENDING_PAYMENT); // to'lanmagan — sanalmaydi
    await sell('Gamma:Mehmon', 100); // Forma 360° rejimida faqat birinchi forma (Uy) ko'rinadi
  });

  afterAll(async () => {
    await app.close();
  });

  const mine = (body: { id: number }[]) => body.filter((k) => Object.values(kits).includes(k.id));

  it('sotilgan soni bo‘yicha tartib; bekor qilingan va to‘lanmaganlar sanalmaydi', async () => {
    const res = await api(app).get('/api/catalog/kits/best-selling?limit=50').expect(200);
    const list = mine(res.body) as { id: number; soldCount: number; club: { name: string } }[];
    expect(list.map((k) => [k.id, k.soldCount])).toEqual([
      [kits['Gamma:Mehmon'], 100],
      [kits['Beta:Uy'], 5],
      [kits['Alfa:Mehmon'], 3],
      [kits['Alfa:Uy'], 0],
      [kits['Gamma:Uy'], 0],
    ]);
    expect(list[0].club.name).toBe(`${tag} Gamma`);
  });

  it('kit360=true — faqat Forma 360° klublari, har klubdan bitta (birinchi) forma', async () => {
    const res = await api(app).get('/api/catalog/kits/best-selling?kit360=true&limit=50').expect(200);
    const list = mine(res.body) as { id: number; club: { kit360Id: string } }[];
    expect(list.map((k) => k.id)).toEqual([kits['Gamma:Uy']]);
    expect(list[0].club.kit360Id).toBe('mci');
  });

  it('limit va yaroqsiz so‘rov', async () => {
    const res = await api(app).get('/api/catalog/kits/best-selling?limit=1').expect(200);
    expect(res.body).toHaveLength(1);
    await api(app).get('/api/catalog/kits/best-selling?limit=0').expect(400);
    await api(app).get('/api/catalog/kits/best-selling?limit=100').expect(400);
  });

  it('formani yoqtirish: idempotent, faqat o‘ziniki, olib tashlash', async () => {
    const as = (token: string) => ({
      get: (url: string) => api(app).get(url).set(bearer(token)),
      put: (url: string) => api(app).put(url).set(bearer(token)),
      del: (url: string) => api(app).delete(url).set(bearer(token)),
    });
    await as(user).put(`/api/catalog/kits/${kits['Alfa:Mehmon']}/favorite`).expect(200);
    await as(user).put(`/api/catalog/kits/${kits['Alfa:Mehmon']}/favorite`).expect(200);
    await as(user).put(`/api/catalog/kits/${kits['Beta:Uy']}/favorite`).expect(200);

    const list = await as(user).get('/api/catalog/favorite-kits').expect(200);
    expect(list.body.map((k: { id: number }) => k.id)).toEqual([kits['Beta:Uy'], kits['Alfa:Mehmon']]);
    expect(list.body[1]).toMatchObject({ label: 'Mehmon', club: { name: `${tag} Alfa` } });
    expect((await as(other).get('/api/catalog/favorite-kits').expect(200)).body).toEqual([]);

    await as(user).del(`/api/catalog/kits/${kits['Beta:Uy']}/favorite`).expect(200);
    expect((await as(user).get('/api/catalog/favorite-kits')).body.map((k: { id: number }) => k.id)).toEqual([kits['Alfa:Mehmon']]);

    // O'chirilgan (nofaol) forma ro'yxatda ko'rinmaydi
    await prisma.kit.update({ where: { id: kits['Alfa:Mehmon'] }, data: { isActive: false } });
    expect((await as(user).get('/api/catalog/favorite-kits')).body).toEqual([]);
    await as(user).put(`/api/catalog/kits/${kits['Alfa:Mehmon']}/favorite`).expect(404);
  });

  it('tokensiz 401, admin 403, mavjud bo‘lmagan forma 404', async () => {
    await api(app).put(`/api/catalog/kits/${kits['Beta:Uy']}/favorite`).expect(401);
    await api(app).get('/api/catalog/favorite-kits').expect(401);
    await api(app).put(`/api/catalog/kits/${kits['Beta:Uy']}/favorite`).set(bearer(admin)).expect(403);
    await api(app).put('/api/catalog/kits/999999/favorite').set(bearer(user)).expect(404);
  });
});
