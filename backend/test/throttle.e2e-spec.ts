import { INestApplication } from '@nestjs/common';

// Rate-limit qiymati dekorator yuklanganda o'qiladi, shuning uchun import'dan oldin o'rnatamiz
process.env.THROTTLE_AUTH_LIMIT = '5';

describe('Brute-force himoyasi (e2e)', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require('./helpers') as typeof import('./helpers');

  beforeAll(async () => {
    ({ app } = await helpers.createApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('login: 5 ta urinishdan keyin 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await helpers
        .api(app)
        .post('/api/auth/login')
        .send({ phone: helpers.SUPERADMIN.phone, password: `wrong${i}` });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});
