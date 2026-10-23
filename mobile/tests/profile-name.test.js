const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { api, ApiError } = require(src('services/api.js'));
const {
  SERVER_PLACEHOLDER_NAME,
  displayName,
  isNameUnsupportedError,
  joinFullName,
  nameInitial,
  realFullName,
  splitFullName,
  validateName,
} = require(src('utils/userName.js'));

function mockFetch(responses) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
    const r = responses.shift();
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  return calls;
}

test('server joy egasi "Yangi mijoz" haqiqiy ism hisoblanmaydi', () => {
  assert.equal(realFullName({ fullName: SERVER_PLACEHOLDER_NAME }), null);
  assert.equal(realFullName({ fullName: '  ' }), null);
  assert.equal(realFullName(null), null);
  assert.equal(realFullName({ fullName: ' Aziz Rahimov ' }), 'Aziz Rahimov');
  assert.equal(displayName({ fullName: SERVER_PLACEHOLDER_NAME }, 'Salom'), 'Salom');
  assert.equal(displayName({ fullName: 'Aziz Rahimov' }, 'Salom'), 'Aziz Rahimov');
  assert.equal(nameInitial({ fullName: SERVER_PLACEHOLDER_NAME }), 'F');
  assert.equal(nameInitial({ fullName: 'aziz' }), 'A');
});

test('ism/familiya ajratish va birlashtirish (ko\'p so\'zli familiya saqlanadi)', () => {
  assert.deepEqual(splitFullName('Aziz Rahimov'), { first: 'Aziz', last: 'Rahimov' });
  assert.deepEqual(splitFullName('Aziz  ibn   Sino'), { first: 'Aziz', last: 'ibn Sino' });
  assert.deepEqual(splitFullName(''), { first: '', last: '' });
  assert.equal(joinFullName('  Aziz ', ' Rahimov  '), 'Aziz Rahimov');
  assert.equal(joinFullName('Aziz', ''), 'Aziz');
  assert.equal(joinFullName(splitFullName('Ali Vali G\'ani').first, splitFullName('Ali Vali G\'ani').last), 'Ali Vali G\'ani');
});

test('ism tekshiruvi backend UpdateProfileDto chegaralariga mos (2–100, HTML yo\'q)', () => {
  assert.equal(validateName('', 'Karimov'), 'fullNameRequired');
  assert.equal(validateName('A', ''), 'fullNameShort');
  assert.equal(validateName('Al', ''), null);
  assert.equal(validateName('x'.repeat(60), 'y'.repeat(40)), 'fullNameTooLong');
  assert.equal(validateName('x'.repeat(50), 'y'.repeat(49)), null); // 50 + bo'shliq + 49 = 100
  assert.equal(validateName('<b>Aziz', ''), 'invalidValue');
});

test('updateUser faqat UpdateProfileDto maydonlarini yuboradi (fullName bor, address/phone yo\'q)', () => {
  const { pickProfileFields } = require(src('features/auth/index.js'));
  assert.deepEqual(
    pickProfileFields({ fullName: 'Aziz', gender: 'MALE', age: 25, height: null, weight: undefined, address: 'x', phone: '+998' }),
    { fullName: 'Aziz', gender: 'MALE', age: 25, height: null },
  );
});

test('PATCH /api/auth/me fullName bilan to\'g\'ri yo\'l va tanada yuboriladi', async () => {
  global.__stubs.memory.formo_access_token = 'ACCESS';
  const calls = mockFetch([{ status: 200, body: { id: 7, fullName: 'Aziz Rahimov', gender: 'MALE', age: 25 } }]);
  const updated = await api.auth.updateMe({ fullName: 'Aziz Rahimov', gender: 'MALE', age: 25 });
  assert.equal(calls[0].url, 'https://api.formo.uz/api/auth/me');
  assert.equal(calls[0].method, 'PATCH');
  assert.equal(calls[0].headers.Authorization, 'Bearer ACCESS');
  assert.deepEqual(calls[0].body, { fullName: 'Aziz Rahimov', gender: 'MALE', age: 25 });
  assert.equal(updated.fullName, 'Aziz Rahimov');
  assert.ok(!calls[0].url.includes('/api/api/'));
});

test('yangilanmagan server javobi (fullName should not exist) aniq ajratiladi', async () => {
  mockFetch([{ status: 400, body: { statusCode: 400, message: ['property fullName should not exist'], error: 'Bad Request' } }]);
  let caught;
  try { await api.auth.updateMe({ fullName: 'Aziz' }); } catch (err) { caught = err; }
  assert.ok(caught instanceof ApiError);
  assert.equal(isNameUnsupportedError(caught), true);
  // Boshqa 400 xatolar ism-qo'llab-quvvatlanmaslik deb hisoblanmaydi
  assert.equal(isNameUnsupportedError(new ApiError('Ismingizni kiriting', 400)), false);
  assert.equal(isNameUnsupportedError(new ApiError('property fullName should not exist', 500)), false);
});
