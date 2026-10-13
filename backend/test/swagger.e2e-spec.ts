import { INestApplication } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { api, createApp } from './helpers';

const basic = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

describe('Swagger himoyasi (e2e)', () => {
  let app: INestApplication;
  const password = randomBytes(12).toString('hex');

  beforeAll(async () => {
    // setupApp shu qiymatlarni ilova yaratilayotganda o'qiydi
    process.env.SWAGGER_USER = 'docs';
    process.env.SWAGGER_PASSWORD = password;
    ({ app } = await createApp());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.SWAGGER_USER;
    delete process.env.SWAGGER_PASSWORD;
  });

  it.each(['/api/docs', '/api/docs/', '/api/docs-json', '/api/docs-yaml', '/api/docs/swagger-ui-init.js'])(
    '%s — parolsiz 401 va brauzer login oynasi',
    async (path) => {
      const res = await api(app).get(path).expect(401);
      expect(res.headers['www-authenticate']).toMatch(/^Basic realm=/);
      expect(res.text).not.toMatch(/swagger|openapi/i);
    },
  );

  it('noto‘g‘ri parol — 401', async () => {
    await api(app).get('/api/docs-json').set('Authorization', basic('docs', 'wrong')).expect(401);
  });

  it('to‘g‘ri login/parol — hujjat ochiladi', async () => {
    const res = await api(app).get('/api/docs-json').set('Authorization', basic('docs', password)).expect(200);
    expect(res.body.info.title).toBe('Formo API');
    await api(app).get('/api/docs').set('Authorization', basic('docs', password)).expect(200);
  });

  it('API ning o‘zi Basic parolni so‘ramaydi (health ochiq, login odatdagidek)', async () => {
    await api(app).get('/api/health').expect(200);
    await api(app).post('/api/auth/login').send({ phone: '+998901111111', password: 'admin123' }).expect(200);
  });

  it('Swagger paroli API ga kirish huquqini bermaydi', async () => {
    await api(app).get('/api/auth/me').set('Authorization', basic('docs', password)).expect(401);
  });
});
