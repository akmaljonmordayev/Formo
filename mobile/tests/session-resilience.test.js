// Sessiya chidamliligi: vaqtinchalik tarmoq/server xatosi foydalanuvchini tizimdan chiqarmasligi kerak.
// MOCK testlar (soxta fetch) — haqiqiy backend chaqirilmaydi.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { api, ApiError, AuthError } = require(src('services/api.js'));
const storage = require(src('utils/storage.js'));
const { isSessionInvalid, meWithRetry } = require(src('features/auth/index.js'));

function mockFetch(responses) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, method: init.method });
    const r = responses.shift();
    if (!r) throw new Error(`kutilmagan so'rov: ${url}`);
    if (r instanceof Error) throw r;
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  return calls;
}

async function seed() {
  await storage.setToken('access-old');
  await storage.setRefreshToken('sid.refresh-old');
}

test('refresh 502/429 (deploy, limit) — tokenlar o‘chirilmaydi, ApiError tashlanadi', async () => {
  for (const status of [502, 429]) {
    await seed();
    mockFetch([{ status: 401, body: {} }, { status, body: { message: 'x' } }]);
    await assert.rejects(api.auth.me(), (err) => err instanceof ApiError && !(err instanceof AuthError) && err.status === status);
    assert.equal(await storage.getToken(), 'access-old');
    assert.equal(await storage.getRefreshToken(), 'sid.refresh-old');
  }
});

test('refresh 401 — sessiya tugagan: tokenlar o‘chiriladi, AuthError', async () => {
  await seed();
  mockFetch([{ status: 401, body: {} }, { status: 401, body: { message: 'Sessiya tugagan' } }]);
  await assert.rejects(api.auth.me(), (err) => err instanceof AuthError);
  assert.equal(await storage.getToken(), null);
  assert.equal(await storage.getRefreshToken(), null);
});

test('ilova ochilganda internet yo‘q: qayta urinadi, keyin muvaffaqiyat', async () => {
  await seed();
  const user = { id: 5, fullName: 'Aziz' };
  const calls = mockFetch([new TypeError('Network request failed'), { status: 503, body: {} }, { status: 200, body: user }]);
  const me = await meWithRetry(() => false, [0, 0]);
  assert.deepEqual(me, user);
  assert.equal(calls.length, 3);
});

test('ilova ochilganda internet umuman yo‘q: xato sessiyani yaroqsiz demaydi (tokenlar saqlanadi)', async () => {
  await seed();
  mockFetch([new TypeError('Network request failed'), new TypeError('x'), new TypeError('y')]);
  await assert.rejects(meWithRetry(() => false, [0, 0]), (err) => !isSessionInvalid(err));
  assert.equal(await storage.getToken(), 'access-old');
});

test('isSessionInvalid: faqat AuthError / 401 / 403', () => {
  assert.equal(isSessionInvalid(new AuthError('x')), true);
  assert.equal(isSessionInvalid(new ApiError('blok', 403)), true);
  assert.equal(isSessionInvalid(new ApiError('x', 500)), false);
  assert.equal(isSessionInvalid(new ApiError('x', 429)), false);
  assert.equal(isSessionInvalid(new TypeError('Network request failed')), false);
});
