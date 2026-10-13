import { INestApplication } from '@nestjs/common';
import { api, createApp, SUPERADMIN } from './helpers';

describe('HTTP xavfsizlik (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('helmet xavfsizlik headerlari mavjud, X-Powered-By yo‘q', async () => {
    const res = await api(app).post('/api/auth/login').send(SUPERADMIN);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('CORS: ruxsat etilgan origin', async () => {
    const res = await api(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('CORS: begona origin uchun ruxsat headeri qaytmaydi', async () => {
    const res = await api(app)
      .options('/api/auth/login')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('xato javoblarida stack trace / SQL tafsilotlari chiqmaydi', async () => {
    const res = await api(app).get('/api/admin/workshops/abc');
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/prisma|at \w+ \(|node_modules|SELECT|stack/i);
  });

  it('mavjud bo‘lmagan route — 401 (global guard) yoki 404, ichki ma’lumot oshkor bo‘lmaydi', async () => {
    const res = await api(app).get('/api/../../etc/passwd');
    expect([401, 404]).toContain(res.status);
  });

  it('Swagger hujjati mavjud va bearer auth ta’riflangan', async () => {
    const res = await api(app).get('/api/docs-json').expect(200);
    expect(res.body.components.securitySchemes.bearer).toBeDefined();
    const paths = Object.keys(res.body.paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/auth/register',
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/refresh',
        '/api/auth/me',
        '/api/admin/operator',
        '/api/admin/workshops',
        '/api/admin/workshops/{id}',
        '/api/admin/users',
      ]),
    );
    // Swagger sxemasida parol xeshi yo'q
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('Swagger UI ochiladi', async () => {
    await api(app).get('/api/docs').expect(200);
  });
});
