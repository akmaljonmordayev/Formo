import { INestApplication } from '@nestjs/common';

// Rate-limit va proxy sozlamalari modul yuklanganda o'qiladi, shuning uchun import'dan oldin o'rnatamiz
process.env.THROTTLE_AUTH_LIMIT = '3';
process.env.TRUST_PROXY = '1';

/** Railway ortida: rate-limit proxy manziliga emas, haqiqiy klient IP siga qarab ishlashi kerak */
describe('Reverse proxy ortida rate-limit (e2e)', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require('./helpers') as typeof import('./helpers');

  const attempt = (clientIp: string) =>
    helpers
      .api(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', clientIp)
      .send({ phone: helpers.SUPERADMIN.phone, password: 'wrong-password' })
      .then((res) => res.status);

  beforeAll(async () => {
    ({ app } = await helpers.createApp());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.TRUST_PROXY;
  });

  it('bir klient limitga yetsa, boshqa klient bloklanmaydi', async () => {
    const first = [];
    for (let i = 0; i < 4; i++) first.push(await attempt('203.0.113.10'));
    expect(first).toEqual([401, 401, 401, 429]);

    expect(await attempt('203.0.113.20')).toBe(401);
  });

  it('klient X-Forwarded-For ni soxtalashtirib limitni aylanib o‘ta olmaydi', async () => {
    // Proxy haqiqiy manzilni har doim oxiriga qo'shadi; klient yozgan qismi (chapdagi) hisobga olinmaydi
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push(await attempt(`10.9.8.${i}, 203.0.113.30`));
    expect(statuses).toEqual([401, 401, 401, 429]);
  });
});
