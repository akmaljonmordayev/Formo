import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, bearer, createApp, login, nextPhone, SQLI_PAYLOADS, SUPERADMIN, XSS_PAYLOADS } from './helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });

  afterAll(async () => {
    await app.close();
  });

  const validUser = () => ({
    phone: nextPhone(),
    password: 'secret123',
    fullName: 'Aziz Rahimov',
  });

  describe('POST /auth/register', () => {
    it("mobil foydalanuvchini ro'yxatdan o'tkazadi va token qaytaradi", async () => {
      const dto = { ...validUser(), gender: 'MALE', age: 25, height: 178, weight: 72 };
      const res = await api(app).post('/api/auth/register').send(dto).expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toMatch(/^[0-9a-f-]{36}\.[0-9a-f]{64}$/);
      expect(res.body.user).toMatchObject({
        phone: dto.phone,
        role: 'USER',
        fullName: 'Aziz Rahimov',
        gender: 'MALE',
        age: 25,
        height: 178,
        weight: 72,
        isActive: true,
      });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('parol bazada bcrypt xesh sifatida saqlanadi (ochiq matn emas)', async () => {
      const dto = validUser();
      await api(app).post('/api/auth/register').send(dto).expect(201);
      const row = await prisma.user.findUnique({ where: { phone: dto.phone } });
      expect(row.passwordHash).not.toContain(dto.password);
      expect(row.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    });

    it.each([
      ['+998 90 555 66 77', '+998905556677'],
      ['998905556678', '+998905556678'],
      ['90 555-66-79', '+998905556679'],
      ['(90) 555 66 80', '+998905556680'],
    ])('telefon raqamni normallashtiradi: %s -> %s', async (input, expected) => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ ...validUser(), phone: input })
        .expect(201);
      expect(res.body.user.phone).toBe(expected);
    });

    it('band telefon raqam — 409 (boshqa formatda yozilgan bo‘lsa ham)', async () => {
      const dto = validUser();
      await api(app).post('/api/auth/register').send(dto).expect(201);
      const spaced = dto.phone.replace(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/, '998 $1 $2 $3 $4');
      const res = await api(app).post('/api/auth/register').send({ ...dto, phone: spaced }).expect(409);
      expect(res.body.message).toMatch(/ro'yxatdan o'tgan/);
    });

    it("superadmin raqami bilan ro'yxatdan o'tib bo'lmaydi", async () => {
      await api(app)
        .post('/api/auth/register')
        .send({ ...validUser(), phone: SUPERADMIN.phone })
        .expect(409);
    });

    it.each([
      ['qisqa parol', { password: '12345' }],
      ['juda uzun parol', { password: 'a'.repeat(65) }],
      ['parol raqam', { password: 12345678 }],
      ['xato telefon (8 xonali)', { phone: '90123456' }],
      ['boshqa davlat raqami', { phone: '+79001234567' }],
      ['telefon harflar', { phone: 'abcdefghijk' }],
      ['telefon obyekt', { phone: { $ne: '' } }],
      ['telefon massiv', { phone: ['+998901234567'] }],
      ['ism bo‘sh', { fullName: '' }],
      ['ism faqat bo‘shliq', { fullName: '     ' }],
      ['ism juda uzun', { fullName: 'a'.repeat(101) }],
      ['noto‘g‘ri jins', { gender: 'OTHER' }],
      ['yosh manfiy', { age: -1 }],
      ['yosh kasr', { age: 25.5 }],
      ['yosh satr', { age: '25' }],
      ['bo‘y juda katta', { height: 999 }],
      ['vazn 0', { weight: 0 }],
    ])('noto‘g‘ri maʼlumot — 400 (%s)', async (_, patch) => {
      await api(app)
        .post('/api/auth/register')
        .send({ ...validUser(), ...patch })
        .expect(400);
    });

    it.each(['phone', 'password', 'fullName'])('majburiy maydon yo‘q — 400 (%s)', async (field) => {
      const dto = validUser();
      delete dto[field];
      await api(app).post('/api/auth/register').send(dto).expect(400);
    });

    it.each([
      ['role', 'SUPERADMIN'],
      ['role', 'OPERATOR'],
      ['isActive', false],
      ['id', 1],
      ['passwordHash', '$2a$10$abc'],
      ['workshopName', 'Sex'],
    ])('mass assignment bloklanadi: %s', async (field, value) => {
      const dto = { ...validUser(), [field]: value };
      await api(app).post('/api/auth/register').send(dto).expect(400);
      expect(await prisma.user.findUnique({ where: { phone: dto.phone } })).toBeNull();
    });

    it.each(XSS_PAYLOADS)('XSS ism maydonida rad etiladi: %s', async (payload) => {
      const dto = { ...validUser(), fullName: payload };
      const res = await api(app).post('/api/auth/register').send(dto).expect(400);
      expect(JSON.stringify(res.body)).not.toContain('<script>');
      expect(await prisma.user.findUnique({ where: { phone: dto.phone } })).toBeNull();
    });

    it("ko'rinmas boshqaruv belgilari va ortiqcha bo'shliqlar tozalanadi", async () => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ ...validUser(), fullName: '  Aziz\u0000​   Rahimov‮ ' })
        .expect(201);
      expect(res.body.user.fullName).toBe('Aziz Rahimov');
    });

    it("o'zbek apostroflari va kirill harflari ruxsat etiladi", async () => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ ...validUser(), fullName: "G'ayrat O‘tkir Шерзод" })
        .expect(201);
      expect(res.body.user.fullName).toBe("G'ayrat O‘tkir Шерзод");
    });

    it('JSON bo‘lmagan / buzilgan body — 400, server yiqilmaydi', async () => {
      await api(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"phone": "+998901234567", ')
        .expect(400);
    });

    it('juda katta body — 413', async () => {
      await api(app)
        .post('/api/auth/register')
        .send({ ...validUser(), fullName: 'a'.repeat(200 * 1024) })
        .expect(413);
    });

    it('prototype pollution urinishi zararsiz', async () => {
      await api(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send(`{"phone":"${nextPhone()}","password":"secret123","fullName":"Ali","__proto__":{"role":"SUPERADMIN"}}`)
        .expect((r) => expect([201, 400]).toContain(r.status));
      expect(({} as Record<string, unknown>).role).toBeUndefined();
      expect(await prisma.user.count({ where: { role: 'SUPERADMIN' } })).toBe(1);
    });
  });

  describe('POST /auth/login', () => {
    it('superadmin kiradi (telefon har qanday formatda)', async () => {
      const res = await api(app)
        .post('/api/auth/login')
        .send({ phone: '+998 (90) 111-11-11', password: SUPERADMIN.password })
        .expect(200);
      expect(res.body.user.role).toBe('SUPERADMIN');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it("noto'g'ri parol va mavjud bo'lmagan raqam bir xil 401 xabar qaytaradi (user enumeration yo'q)", async () => {
      const a = await api(app).post('/api/auth/login').send({ phone: SUPERADMIN.phone, password: 'wrong' }).expect(401);
      const b = await api(app).post('/api/auth/login').send({ phone: '+998999999999', password: 'wrong' }).expect(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('bloklangan akkaunt — 403', async () => {
      const dto = validUser();
      await api(app).post('/api/auth/register').send(dto).expect(201);
      await prisma.user.update({ where: { phone: dto.phone }, data: { isActive: false } });
      await api(app).post('/api/auth/login').send({ phone: dto.phone, password: dto.password }).expect(403);
    });

    it.each(SQLI_PAYLOADS)('SQL injection telefon maydonida — 400: %s', async (payload) => {
      await api(app).post('/api/auth/login').send({ phone: payload, password: 'x' }).expect(400);
    });

    it.each(SQLI_PAYLOADS)('SQL injection parol maydonida — 401: %s', async (payload) => {
      await api(app).post('/api/auth/login').send({ phone: SUPERADMIN.phone, password: payload }).expect(401);
    });

    it.each([
      ['parol obyekt', { phone: SUPERADMIN.phone, password: { $gt: '' } }],
      ['parol null', { phone: SUPERADMIN.phone, password: null }],
      ['parol bo‘sh', { phone: SUPERADMIN.phone, password: '' }],
      ['body bo‘sh', {}],
    ])('type confusion — 400 (%s)', async (_, body) => {
      await api(app).post('/api/auth/login').send(body).expect(400);
    });
  });

  describe('Token himoyasi (GET /auth/me)', () => {
    it('token bilan joriy foydalanuvchini qaytaradi', async () => {
      const { accessToken } = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      const res = await api(app).get('/api/auth/me').set(bearer(accessToken)).expect(200);
      expect(res.body).toMatchObject({ phone: SUPERADMIN.phone, role: 'SUPERADMIN' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it.each([
      ['header yo‘q', {}],
      ['bo‘sh bearer', { Authorization: 'Bearer ' }],
      ['axlat token', { Authorization: 'Bearer abc.def.ghi' }],
      ['Bearer so‘zisiz', { Authorization: 'eyJhbGciOiJIUzI1NiJ9.e30.x' }],
      ['Basic auth', { Authorization: 'Basic YWRtaW46YWRtaW4=' }],
    ])('401 — %s', async (_, headers) => {
      await api(app).get('/api/auth/me').set(headers).expect(401);
    });

    it('boshqa secret bilan imzolangan token — 401', async () => {
      const { accessToken } = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      const payload = new JwtService().decode(accessToken);
      const forged = new JwtService({ secret: 'attacker-secret' }).sign({
        sub: payload.sub,
        role: 'SUPERADMIN',
        sid: payload.sid,
      });
      await api(app).get('/api/auth/me').set(bearer(forged)).expect(401);
    });

    it('alg=none token — 401', async () => {
      const { accessToken } = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      const [, body] = accessToken.split('.');
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      await api(app).get('/api/auth/me').set(bearer(`${header}.${body}.`)).expect(401);
    });

    it("payload o'zgartirilgan (role ko'tarilgan) token — 401", async () => {
      const user = validUser();
      const reg = await api(app).post('/api/auth/register').send(user).expect(201);
      const [h, b, s] = reg.body.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
      const tampered = Buffer.from(JSON.stringify({ ...payload, role: 'SUPERADMIN' })).toString('base64url');
      await api(app).get('/api/auth/me').set(bearer(`${h}.${tampered}.${s}`)).expect(401);
    });

    it('muddati o‘tgan token — 401', async () => {
      const { accessToken } = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      const payload = new JwtService().decode(accessToken);
      const expired = new JwtService({ secret: process.env.JWT_ACCESS_SECRET }).sign(
        { sub: payload.sub, role: payload.role, sid: payload.sid },
        { expiresIn: -10 },
      );
      await api(app).get('/api/auth/me').set(bearer(expired)).expect(401);
    });

    it('to‘g‘ri secret, lekin mavjud bo‘lmagan sessiya — 401', async () => {
      const token = new JwtService({ secret: process.env.JWT_ACCESS_SECRET }).sign({
        sub: 1,
        role: 'SUPERADMIN',
        sid: '00000000-0000-0000-0000-000000000000',
      });
      await api(app).get('/api/auth/me').set(bearer(token)).expect(401);
    });

    it('boshqa foydalanuvchi sessiyasi bilan sub almashtirilgan token — 401', async () => {
      const reg = await api(app).post('/api/auth/register').send(validUser()).expect(201);
      const payload = new JwtService().decode(reg.body.accessToken);
      const token = new JwtService({ secret: process.env.JWT_ACCESS_SECRET }).sign({
        sub: 1, // superadmin id
        role: 'SUPERADMIN',
        sid: payload.sid, // oddiy user sessiyasi
      });
      await api(app).get('/api/auth/me').set(bearer(token)).expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('yangi juftlik beradi va eski refresh token bekor bo‘ladi (rotatsiya)', async () => {
      const first = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      const res = await api(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200);

      expect(res.body.refreshToken).not.toBe(first.refreshToken);
      await api(app).get('/api/auth/me').set(bearer(res.body.accessToken)).expect(200);
    });

    it("eski refresh token qayta ishlatilsa — butun sessiya yopiladi (o'g'irlik aniqlash)", async () => {
      const first = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      const second = await api(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200);

      await api(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
      // Hujumchi eski tokenni ishlatgani uchun qonuniy foydalanuvchining yangi tokenlari ham o'ladi
      await api(app).get('/api/auth/me').set(bearer(second.body.accessToken)).expect(401);
      await api(app).post('/api/auth/refresh').send({ refreshToken: second.body.refreshToken }).expect(401);
    });

    it.each([
      ['axlat', 'garbage'],
      ['nuqtasiz', 'abc'],
      ['uuid emas', 'not-a-uuid.abcdef'],
      ['mavjud bo‘lmagan sessiya', '00000000-0000-0000-0000-000000000000.' + 'a'.repeat(64)],
      ['SQLi', "' OR 1=1 --.x"],
    ])('yaroqsiz refresh token — 401 (%s)', async (_, refreshToken) => {
      await api(app).post('/api/auth/refresh').send({ refreshToken }).expect(401);
    });

    it('refreshToken satr emas — 400', async () => {
      await api(app).post('/api/auth/refresh').send({ refreshToken: { a: 1 } }).expect(400);
    });

    it('access token refresh token o‘rnida ishlamaydi', async () => {
      const { accessToken } = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      await api(app).post('/api/auth/refresh').send({ refreshToken: accessToken }).expect(401);
    });

    it('bloklangan foydalanuvchi refresh qila olmaydi', async () => {
      const dto = validUser();
      const reg = await api(app).post('/api/auth/register').send(dto).expect(201);
      await prisma.user.update({ where: { phone: dto.phone }, data: { isActive: false } });
      await api(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: reg.body.refreshToken })
        .expect((r) => expect([401, 403]).toContain(r.status));
    });
  });

  describe('POST /auth/logout', () => {
    it('access va refresh token darhol ishlamay qoladi', async () => {
      const s = await login(app, SUPERADMIN.phone, SUPERADMIN.password);
      await api(app).post('/api/auth/logout').set(bearer(s.accessToken)).expect(200);

      await api(app).get('/api/auth/me').set(bearer(s.accessToken)).expect(401);
      await api(app).post('/api/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
      await api(app).post('/api/auth/logout').set(bearer(s.accessToken)).expect(401);
    });

    it('faqat joriy qurilma chiqadi, boshqa sessiyalar ishlayveradi', async () => {
      const phone = SUPERADMIN.phone;
      const a = await login(app, phone, SUPERADMIN.password);
      const b = await login(app, phone, SUPERADMIN.password);
      await api(app).post('/api/auth/logout').set(bearer(a.accessToken)).expect(200);
      await api(app).get('/api/auth/me').set(bearer(b.accessToken)).expect(200);
    });

    it('tokensiz — 401', async () => {
      await api(app).post('/api/auth/logout').expect(401);
    });

    it('logout-all barcha qurilmalarni chiqaradi', async () => {
      const dto = validUser();
      await api(app).post('/api/auth/register').send(dto).expect(201);
      const a = await login(app, dto.phone, dto.password);
      const b = await login(app, dto.phone, dto.password);
      await api(app).post('/api/auth/logout-all').set(bearer(a.accessToken)).expect(200);
      await api(app).get('/api/auth/me').set(bearer(a.accessToken)).expect(401);
      await api(app).get('/api/auth/me').set(bearer(b.accessToken)).expect(401);
    });
  });

  describe('PATCH /auth/password', () => {
    it('joriy parol xato — 401', async () => {
      const dto = validUser();
      const reg = await api(app).post('/api/auth/register').send(dto).expect(201);
      await api(app)
        .patch('/api/auth/password')
        .set(bearer(reg.body.accessToken))
        .send({ currentPassword: 'wrong', newPassword: 'newsecret1' })
        .expect(401);
    });

    it('yangi parol qisqa — 400', async () => {
      const reg = await api(app).post('/api/auth/register').send(validUser()).expect(201);
      await api(app)
        .patch('/api/auth/password')
        .set(bearer(reg.body.accessToken))
        .send({ currentPassword: 'secret123', newPassword: '123' })
        .expect(400);
    });

    it('parol almashadi, boshqa sessiyalar yopiladi, joriy sessiya qoladi', async () => {
      const dto = validUser();
      const a = (await api(app).post('/api/auth/register').send(dto).expect(201)).body;
      const b = await login(app, dto.phone, dto.password);

      await api(app)
        .patch('/api/auth/password')
        .set(bearer(a.accessToken))
        .send({ currentPassword: dto.password, newPassword: 'newsecret1' })
        .expect(200);

      await api(app).get('/api/auth/me').set(bearer(a.accessToken)).expect(200);
      await api(app).get('/api/auth/me').set(bearer(b.accessToken)).expect(401);
      await api(app).post('/api/auth/login').send({ phone: dto.phone, password: dto.password }).expect(401);
      await login(app, dto.phone, 'newsecret1');
    });
  });
});
