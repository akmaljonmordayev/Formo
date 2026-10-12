import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, createApp } from './helpers';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.restoreAllMocks());

  it('GET /api/health — tokensiz ochiq, baza bilan birga tekshiradi', async () => {
    const res = await api(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', uptime: expect.any(Number) });
  });

  it('baza ishlamasa — 503 (Railway yangi deployni trafikka qo‘ymaydi)', async () => {
    jest.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
    const res = await api(app).get('/api/health').expect(503);
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|10\.0\.0\.5/);
  });

  it('rate-limit healthcheckka qo‘llanmaydi', async () => {
    const res = await api(app).get('/api/health').expect(200);
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });
});
