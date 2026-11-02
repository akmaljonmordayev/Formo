// Telegram bot orqali kirish: API klient shartnomasi, sessiya va xato matnlari.
// Bular MOCK testlar (soxta fetch) — haqiqiy Telegram yoki backend chaqirilmaydi.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { api, ApiError } = require(src('services/api.js'));
const storage = require(src('utils/storage.js'));
const {
  TELEGRAM_CODE_LENGTH,
  cleanCode,
  formatCountdown,
  isValidChallenge,
  secondsUntil,
  telegramErrorText,
  telegramAppLink,
} = require(src('features/auth/telegram.js'));

const CHALLENGE = {
  challengeId: '11111111-1111-4111-8111-111111111111',
  botUsername: 'formo_kit_bot',
  deepLink: 'https://t.me/formo_kit_bot?start=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
};
const SESSION = { accessToken: 'access-1', refreshToken: 'sid.refresh-1', user: { id: 5, phone: '+998901234567', fullName: 'Yangi mijoz' } };
const t = (key) => `t:${key}`;

function mockFetch(responses) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
    const r = responses.shift();
    if (!r) throw new Error(`kutilmagan so'rov: ${url}`);
    if (r instanceof Error) throw r;
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  return calls;
}

async function resetSession() {
  await storage.removeToken();
  await storage.removeRefreshToken();
}

test('telegramStart: POST /auth/telegram/start, raqam normallashadi, Authorization yuborilmaydi', async () => {
  await storage.setToken('old-token'); // eski sessiya bo'lsa ham ochiq endpointga token ketmasin
  const calls = mockFetch([{ status: 200, body: CHALLENGE }]);

  const res = await api.auth.telegramStart('90 123 45 67');

  assert.deepEqual(res, CHALLENGE);
  assert.match(calls[0].url, /\/api\/auth\/telegram\/start$/);
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(calls[0].body, { phone: '+998901234567' });
  assert.equal(calls[0].headers.Authorization, undefined);
  await resetSession();
});

test('telegramVerify: sessiya saqlanadi va keyingi so‘rovlar shu token bilan ketadi', async () => {
  await resetSession();
  const calls = mockFetch([
    { status: 200, body: { ...SESSION, isNewUser: true, profileComplete: false } },
    { status: 200, body: SESSION.user },
  ]);

  const res = await api.auth.telegramVerify(CHALLENGE.challengeId, '48213');

  assert.deepEqual(calls[0].body, { challengeId: CHALLENGE.challengeId, code: '48213' });
  assert.deepEqual(res, { user: SESSION.user, isNewUser: true, profileComplete: false });
  assert.equal(await storage.getToken(), 'access-1');
  assert.equal(await storage.getRefreshToken(), 'sid.refresh-1');

  await api.auth.me();
  assert.equal(calls[1].headers.Authorization, 'Bearer access-1');
  await resetSession();
});

test('telegramVerify: mavjud hisob — isNewUser false', async () => {
  mockFetch([{ status: 200, body: { ...SESSION, user: { ...SESSION.user, fullName: 'Aziz' }, isNewUser: false, profileComplete: true } }]);
  const res = await api.auth.telegramVerify(CHALLENGE.challengeId, '48213');
  assert.equal(res.isNewUser, false);
  assert.equal(res.user.fullName, 'Aziz');
  await resetSession();
});

test('noto‘g‘ri kod (401): refresh qilinmaydi, mavjud tokenlar o‘chirilmaydi, sessiya ochilmaydi', async () => {
  await storage.setToken('keep-access');
  await storage.setRefreshToken('keep-refresh');
  const calls = mockFetch([{ status: 401, body: { statusCode: 401, message: "Tasdiqlash kodi noto'g'ri" } }]);

  const err = await api.auth.telegramVerify(CHALLENGE.challengeId, '00000').catch((e) => e);

  assert.ok(err instanceof ApiError);
  assert.equal(err.status, 401);
  assert.equal(calls.length, 1); // /auth/refresh chaqirilmadi
  assert.equal(await storage.getToken(), 'keep-access');
  assert.equal(await storage.getRefreshToken(), 'keep-refresh');
  await resetSession();
});

test('cheklov (429) va sozlanmagan bot (503) — ApiError status bilan', async () => {
  mockFetch([{ status: 429, body: { message: 'x' } }, { status: 503, body: { message: 'Telegram orqali kirish hozircha sozlanmagan' } }]);
  const tooMany = await api.auth.telegramStart('901234567').catch((e) => e);
  const unavailable = await api.auth.telegramStart('901234567').catch((e) => e);
  assert.equal(tooMany.status, 429);
  assert.equal(unavailable.status, 503);
});

test('Telegram orqali ochilgan sessiya: access token eskirsa refresh bilan davom etadi', async () => {
  await resetSession();
  const calls = mockFetch([
    { status: 200, body: { ...SESSION, isNewUser: false, profileComplete: true } },
    { status: 401, body: { message: 'Unauthorized' } },
    { status: 200, body: { accessToken: 'access-2', refreshToken: 'sid.refresh-2' } },
    { status: 200, body: SESSION.user },
  ]);

  await api.auth.telegramVerify(CHALLENGE.challengeId, '48213');
  const me = await api.auth.me();

  assert.deepEqual(me, SESSION.user);
  assert.match(calls[2].url, /\/auth\/refresh$/);
  assert.deepEqual(calls[2].body, { refreshToken: 'sid.refresh-1' });
  assert.equal(calls[3].headers.Authorization, 'Bearer access-2');
  assert.equal(await storage.getRefreshToken(), 'sid.refresh-2');
  await resetSession();
});

test('xato matnlari: muddati o‘tgan va noto‘g‘ri kod ajratiladi', () => {
  assert.equal(telegramErrorText(new ApiError("Kod noto'g'ri yoki muddati o'tgan. Ilovada qaytadan urinib ko'ring", 401), t), 't:tgCodeExpired');
  assert.equal(telegramErrorText(new ApiError("Tasdiqlash kodi noto'g'ri", 401), t), 't:otpCodeWrong');
  assert.equal(telegramErrorText(new ApiError('x', 429), t), 't:tooManyAttempts');
  assert.equal(telegramErrorText(new ApiError('x', 503), t), 't:tgUnavailable');
  assert.equal(telegramErrorText(new ApiError('Akkauntingiz bloklangan', 403), t), 'Akkauntingiz bloklangan');
  // Dev'da xabarga sabab va server manzili qo'shiladi
  assert.match(telegramErrorText(new TypeError('Network request failed'), t), /^t:networkError/);
  assert.match(telegramErrorText(new Error('fetch failed'), t), /^t:networkError/);
});

test('yordamchilar: muddat, kod tozalash, deep-link tekshiruvi', () => {
  const now = Date.UTC(2026, 0, 1);
  assert.equal(secondsUntil(new Date(now + 90_500).toISOString(), now), 91);
  assert.equal(secondsUntil(new Date(now - 1000).toISOString(), now), 0);
  assert.equal(secondsUntil('not-a-date', now), 0);
  assert.equal(formatCountdown(125), '2:05');
  assert.equal(formatCountdown(0), '0:00');

  assert.equal(TELEGRAM_CODE_LENGTH, 5);
  assert.equal(cleanCode('Kod: 48 213 99'), '48213');

  assert.equal(isValidChallenge(CHALLENGE), true);
  assert.equal(isValidChallenge({ ...CHALLENGE, deepLink: 'https://evil.example/formo_kit_bot?start=x' }), false);
  assert.equal(isValidChallenge({ ...CHALLENGE, deepLink: 'tg://resolve?domain=formo_kit_bot' }), false);
  assert.equal(isValidChallenge(null), false);
});

test('telegramAppLink: t.me havolasi tg:// ga aylanadi, noto‘g‘risi — null', () => {
  assert.equal(
    telegramAppLink('https://t.me/formo_bot?start=abcdefghijklmnopqrstuv'),
    'tg://resolve?domain=formo_bot&start=abcdefghijklmnopqrstuv',
  );
  assert.equal(telegramAppLink('https://evil.com/formo_bot?start=x'), null);
  assert.equal(telegramAppLink(undefined), null);
});
