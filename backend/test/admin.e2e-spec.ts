import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, bearer, createApp, login, nextPhone, SUPERADMIN, XSS_PAYLOADS } from './helpers';

describe('Admin CRUD va RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    admin = (await login(app, SUPERADMIN.phone, SUPERADMIN.password)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (token: string) => ({
    get: (url: string) => api(app).get(url).set(bearer(token)),
    post: (url: string, body?: object) => api(app).post(url).set(bearer(token)).send(body),
    patch: (url: string, body?: object) => api(app).patch(url).set(bearer(token)).send(body),
    delete: (url: string) => api(app).delete(url).set(bearer(token)),
  });

  const workshopDto = () => ({
    phone: nextPhone(),
    password: 'tailor123',
    fullName: 'Akmal Toshev',
    workshopName: 'Ipak Yo‘li Tikuv',
    address: 'Toshkent, Chilonzor 7',
  });

  async function createWorkshop(overrides = {}) {
    const dto = { ...workshopDto(), ...overrides };
    const res = await as(admin).post('/api/admin/workshops', dto).expect(201);
    return { dto, body: res.body };
  }

  describe('Tikuv sexlari CRUD', () => {
    it('yaratadi va tikuv sexi login qila oladi (role TAILOR)', async () => {
      const { dto, body } = await createWorkshop();
      expect(body).toMatchObject({
        role: 'TAILOR',
        workshopName: dto.workshopName,
        address: dto.address,
        fullName: dto.fullName,
      });
      const s = await login(app, dto.phone, dto.password);
      expect(s.user.role).toBe('TAILOR');
    });

    it('band telefon — 409 (superadmin raqami ham)', async () => {
      const { dto } = await createWorkshop();
      await as(admin).post('/api/admin/workshops', { ...workshopDto(), phone: dto.phone }).expect(409);
      await as(admin).post('/api/admin/workshops', { ...workshopDto(), phone: SUPERADMIN.phone }).expect(409);
    });

    it.each([
      ['workshopName yo‘q', { workshopName: undefined }],
      ['qisqa parol', { password: '123' }],
      ['xato telefon', { phone: '123' }],
      ['role kiritilgan', { role: 'SUPERADMIN' }],
      ['manzil juda uzun', { address: 'a'.repeat(256) }],
      ["sig'im 0", { dailyCapacity: 0 }],
      ["sig'im juda katta", { dailyCapacity: 10001 }],
    ])('validatsiya — 400 (%s)', async (_, patch) => {
      await as(admin).post('/api/admin/workshops', { ...workshopDto(), ...patch }).expect(400);
    });

    it("kunlik sig'im yaratishda va tahrirda saqlanadi, dashboard sig'imiga qo'shiladi", async () => {
      const created = await as(admin).post('/api/admin/workshops', { ...workshopDto(), dailyCapacity: 40 }).expect(201);
      expect(created.body.dailyCapacity).toBe(40);
      const updated = await as(admin).patch(`/api/admin/workshops/${created.body.id}`, { dailyCapacity: 55 }).expect(200);
      expect(updated.body.dailyCapacity).toBe(55);
      expect((await as(admin).get('/api/admin/dashboard?all=true').expect(200)).body.capacity).toBeGreaterThanOrEqual(55);
    });

    it.each(XSS_PAYLOADS)('XSS workshopName/address/fullName da rad etiladi: %s', async (payload) => {
      await as(admin).post('/api/admin/workshops', { ...workshopDto(), workshopName: payload }).expect(400);
      await as(admin).post('/api/admin/workshops', { ...workshopDto(), address: payload }).expect(400);
      await as(admin).post('/api/admin/workshops', { ...workshopDto(), fullName: payload }).expect(400);
    });

    it("ro'yxat: pagination, qidiruv (nom/telefon), status filtri", async () => {
      const unique = `Zarafshon${Date.now()}`;
      const { dto } = await createWorkshop({ workshopName: unique });

      const byName = await as(admin).get(`/api/admin/workshops?search=${unique.toLowerCase()}`).expect(200);
      expect(byName.body.items).toHaveLength(1);
      expect(byName.body.items[0]).not.toHaveProperty('passwordHash');

      const byPhone = await as(admin)
        .get(`/api/admin/workshops?search=${encodeURIComponent(dto.phone.slice(-7))}`)
        .expect(200);
      expect(byPhone.body.items.map((w) => w.phone)).toContain(dto.phone);

      const page = await as(admin).get('/api/admin/workshops?page=1&limit=2').expect(200);
      expect(page.body.items.length).toBeLessThanOrEqual(2);
      expect(page.body).toMatchObject({ page: 1, limit: 2, total: expect.any(Number) });

      const active = await as(admin).get('/api/admin/workshops?isActive=true').expect(200);
      expect(active.body.items.every((w) => w.isActive)).toBe(true);

      // faqat TAILOR qaytadi
      expect(page.body.items.every((w) => w.role === 'TAILOR')).toBe(true);
    });

    it.each([
      ['limit 0', '?limit=0'],
      ['limit 1000', '?limit=1000'],
      ['page -1', '?page=-1'],
      ['page satr', '?page=abc'],
      ['isActive xato', '?isActive=maybe'],
      ['noma’lum parametr', '?role=SUPERADMIN'],
    ])("ro'yxat query validatsiyasi — 400 (%s)", async (_, qs) => {
      await as(admin).get(`/api/admin/workshops${qs}`).expect(400);
    });

    it('qidiruvda SQL/regex belgilar xavfsiz', async () => {
      for (const q of ["' OR 1=1 --", '%', '_', '.*', '\\']) {
        const res = await as(admin).get(`/api/admin/workshops?search=${encodeURIComponent(q)}`).expect(200);
        expect(Array.isArray(res.body.items)).toBe(true);
      }
    });

    it('GET/PATCH/DELETE :id', async () => {
      const { body } = await createWorkshop();
      await as(admin).get(`/api/admin/workshops/${body.id}`).expect(200);

      const upd = await as(admin)
        .patch(`/api/admin/workshops/${body.id}`, { workshopName: 'Yangi nom', address: 'Samarqand' })
        .expect(200);
      expect(upd.body).toMatchObject({ workshopName: 'Yangi nom', address: 'Samarqand' });

      await as(admin).delete(`/api/admin/workshops/${body.id}`).expect(200);
      await as(admin).get(`/api/admin/workshops/${body.id}`).expect(404);
      await as(admin).delete(`/api/admin/workshops/${body.id}`).expect(404);
    });

    it.each(['abc', '1.5', '-1', "1' OR '1'='1", '99999999999999999999'])('noto‘g‘ri id — 400/404: %s', async (id) => {
      const res = await as(admin).get(`/api/admin/workshops/${encodeURIComponent(id)}`);
      expect([400, 404]).toContain(res.status);
    });

    it("rol izolyatsiyasi: superadmin/user id'si orqali workshops endpointi ularni o'zgartira olmaydi", async () => {
      const reg = await api(app)
        .post('/api/auth/register')
        .send({ phone: nextPhone(), password: 'secret123', fullName: 'Oddiy user' })
        .expect(201);
      for (const id of [1, reg.body.user.id]) {
        await as(admin).get(`/api/admin/workshops/${id}`).expect(404);
        await as(admin).patch(`/api/admin/workshops/${id}`, { fullName: 'Hacked' }).expect(404);
        await as(admin).delete(`/api/admin/workshops/${id}`).expect(404);
      }
      const sa = await prisma.user.findUnique({ where: { id: 1 } });
      expect(sa.role).toBe('SUPERADMIN');
      expect(sa.fullName).toBe('Super Admin');
    });

    it("tikuv sexi bloklansa/parol o'zgarsa sessiyalari yopiladi; o'chirilsa login 401", async () => {
      const { dto, body } = await createWorkshop();
      const s1 = await login(app, dto.phone, dto.password);
      await as(admin).patch(`/api/admin/workshops/${body.id}`, { isActive: false }).expect(200);
      await as(s1.accessToken).get('/api/auth/me').expect(401);
      await api(app).post('/api/auth/login').send({ phone: dto.phone, password: dto.password }).expect(403);

      await as(admin).patch(`/api/admin/workshops/${body.id}`, { isActive: true, password: 'newpass1' }).expect(200);
      const s2 = await login(app, dto.phone, 'newpass1');

      await as(admin).delete(`/api/admin/workshops/${body.id}`).expect(200);
      await as(s2.accessToken).get('/api/auth/me').expect(401);
      await api(app).post('/api/auth/login').send({ phone: dto.phone, password: 'newpass1' }).expect(401);
    });
  });

  describe('Mobil foydalanuvchilar (admin/users)', () => {
    let user: { id: number; phone: string };
    const password = 'secret123';

    beforeAll(async () => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ phone: nextPhone(), password, fullName: 'Mobil User' })
        .expect(201);
      user = res.body.user;
    });

    it("ro'yxatda faqat USER rollari, parol xeshisiz", async () => {
      const res = await as(admin).get('/api/admin/users?limit=100').expect(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.every((u) => u.role === 'USER' && !('passwordHash' in u))).toBe(true);
    });

    it('bloklash: token o‘ladi, login 403; blokdan chiqarish: login ishlaydi', async () => {
      const s = await login(app, user.phone, password);
      await as(admin).patch(`/api/admin/users/${user.id}/status`, { isActive: false }).expect(200);
      await as(s.accessToken).get('/api/auth/me').expect(401);
      await api(app).post('/api/auth/login').send({ phone: user.phone, password }).expect(403);

      await as(admin).patch(`/api/admin/users/${user.id}/status`, { isActive: true }).expect(200);
      await login(app, user.phone, password);
    });

    it('status endpointi faqat isActive qabul qiladi', async () => {
      await as(admin).patch(`/api/admin/users/${user.id}/status`, { isActive: 'yes' }).expect(400);
      await as(admin).patch(`/api/admin/users/${user.id}/status`, { isActive: true, role: 'SUPERADMIN' }).expect(400);
    });

    it('superadminni users endpointi orqali bloklab bo‘lmaydi', async () => {
      await as(admin).patch('/api/admin/users/1/status', { isActive: false }).expect(404);
      await login(app, SUPERADMIN.phone, SUPERADMIN.password);
    });

    it("o'chirish", async () => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ phone: nextPhone(), password, fullName: 'Delete Me' })
        .expect(201);
      await as(admin).delete(`/api/admin/users/${res.body.user.id}`).expect(200);
      await as(res.body.accessToken).get('/api/auth/me').expect(401);
    });
  });

  describe('RBAC — ruxsatlar matritsasi', () => {
    let tokens: Record<'TAILOR' | 'USER', string>;
    let workshopId: number;

    beforeAll(async () => {
      const { dto, body } = await createWorkshop();
      workshopId = body.id;
      const userDto = { phone: nextPhone(), password: 'secret123', fullName: 'Ulug‘bek' };
      await api(app).post('/api/auth/register').send(userDto).expect(201);

      tokens = {
        TAILOR: (await login(app, dto.phone, dto.password)).accessToken,
        USER: (await login(app, userDto.phone, userDto.password)).accessToken,
      };
    });

    const superadminOnly = () => [
      ['POST', '/api/admin/workshops'],
      ['PATCH', `/api/admin/workshops/${workshopId}`],
      ['DELETE', `/api/admin/workshops/${workshopId}`],
      ['GET', '/api/admin/users'],
      ['GET', '/api/admin/users/1'],
      ['PATCH', '/api/admin/users/1/status'],
      ['DELETE', '/api/admin/users/1'],
    ];

    const call = (method: string, url: string, token?: string) => {
      const req = api(app)[method.toLowerCase()](url);
      if (token) req.set(bearer(token));
      return method === 'GET' || method === 'DELETE' ? req : req.send({ isActive: false, fullName: 'x' });
    };

    it.each(['TAILOR', 'USER'] as const)('%s superadmin endpointlariga kira olmaydi — 403', async (role) => {
      for (const [method, url] of superadminOnly()) {
        const res = await call(method, url, tokens[role]);
        expect({ role, method, url, status: res.status }).toEqual({ role, method, url, status: 403 });
      }
      expect(await prisma.user.findFirst({ where: { id: workshopId } })).not.toBeNull();
    });

    it('tokensiz hamma admin endpointlar — 401', async () => {
      for (const [method, url] of [...superadminOnly(), ['GET', '/api/admin/workshops']]) {
        const res = await call(method, url);
        expect({ method, url, status: res.status }).toEqual({ method, url, status: 401 });
      }
    });

    it.each(['TAILOR', 'USER'] as const)("%s tikuv sexlari ro'yxatini ko'ra olmaydi", async (role) => {
      await as(tokens[role]).get('/api/admin/workshops').expect(403);
    });

    it('har bir rol logout qila oladi va keyin token ishlamaydi', async () => {
      for (const role of ['TAILOR', 'USER'] as const) {
        await as(tokens[role]).post('/api/auth/logout').expect(200);
        await as(tokens[role]).get('/api/auth/me').expect(401);
      }
      const s = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      await as(s.accessToken).post('/api/auth/logout').expect(200);
      await as(s.accessToken).get('/api/admin/users').expect(401);
    });
  });

  it('superadmin yagona: qayta ishga tushganda ikkinchisi yaratilmaydi', async () => {
    expect(await prisma.user.count({ where: { role: 'SUPERADMIN' } })).toBe(1);
  });
});
