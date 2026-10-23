const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const loc = require(src('features/location/address.js'));
const { saveAddress, searchPlace } = require(src('features/location/index.js'));

function mockFetch(responses) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
    const r = responses.shift();
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  return calls;
}

test('reverse geocode natijasi takrorsiz o\'qiladigan manzilga aylanadi', () => {
  assert.equal(
    loc.formatGeocode({ city: 'Toshkent', district: 'Yunusobod', street: 'Amir Temur', streetNumber: '108', name: 'Amir Temur 108' }),
    'Toshkent, Yunusobod, Amir Temur 108',
  );
  // street yo'q — name ishlatiladi; city bilan bir xil district takrorlanmaydi
  assert.equal(loc.formatGeocode({ city: 'Toshkent', district: 'toshkent', name: 'Chorsu bozori' }), 'Toshkent, Chorsu bozori');
  assert.equal(loc.formatGeocode(null), '');
  assert.ok(loc.formatGeocode({ city: 'x'.repeat(300) }).length <= loc.ADDRESS_LIMITS.address);
});

test('forma tekshiruvi CreateAddressDto chegaralariga mos', () => {
  const ok = { label: 'Uy', address: 'Yunusobod, Amir Temur 108', apartment: '45', coords: { latitude: 41.36, longitude: 69.28 } };
  assert.deepEqual(loc.validateAddressForm(ok), {});
  assert.equal(loc.validateAddressForm({ ...ok, label: ' ' }).label, 'addrLabelInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, label: 'x'.repeat(31) }).label, 'addrLabelInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, address: 'abcd' }).address, 'addrTextInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, apartment: 'x'.repeat(61) }).apartment, 'addrApartmentInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, address: '<script>alert(1)</script>' }).address, 'invalidValue');
  assert.equal(loc.validateAddressForm({ ...ok, coords: { latitude: 120, longitude: 0 } }).coords, 'locationInvalid');
});

test('POST tanasi: faqat DTO maydonlari, koordinata 6 xonagacha, bo\'sh xonadon yuborilmaydi', () => {
  const body = loc.toAddressPayload({
    label: ' Uy ',
    address: ' Yunusobod,   Amir Temur 108 ',
    apartment: '  ',
    coords: { latitude: 41.366712345, longitude: 69.284098765 },
    isDefault: true,
  });
  assert.deepEqual(body, { label: 'Uy', address: 'Yunusobod, Amir Temur 108', latitude: 41.366712, longitude: 69.284099, isDefault: true });
  // Koordinatasiz (GPS/xarita ishlamasa) — manzil baribir saqlanadi
  assert.deepEqual(loc.toAddressPayload({ label: 'Ish', address: 'Mirobod 7-uy' }), { label: 'Ish', address: 'Mirobod 7-uy' });
  // PATCH: bo'shatilgan xonadon '' bilan tozalanadi
  assert.equal(loc.toAddressPayload({ label: 'Uy', address: 'Mirobod 7-uy', apartment: '' }, { isUpdate: true }).apartment, '');
});

test('saqlangan manzil koordinatasi faqat haqiqiy bo\'lsa qaytadi', () => {
  assert.deepEqual(loc.addressCoords({ latitude: 41.3, longitude: 69.2 }), { latitude: 41.3, longitude: 69.2 });
  assert.equal(loc.addressCoords({ latitude: null, longitude: null }), null);
  assert.equal(loc.addressCoords(null), null);
});

test('saveAddress: yangi -> POST /api/addresses, tahrir -> PATCH /api/addresses/:id', async () => {
  const form = { label: 'Uy', address: 'Yunusobod, Amir Temur 108', apartment: '', coords: { latitude: 41.3667, longitude: 69.2841 }, isDefault: false };
  const calls = mockFetch([{ status: 201, body: { id: 5 } }, { status: 200, body: { id: 5 } }]);
  assert.deepEqual(await saveAddress(form), { id: 5 });
  await saveAddress({ ...form, isDefault: true }, 5);
  assert.equal(calls[0].url, 'https://api.formo.uz/api/addresses');
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(calls[0].body, { label: 'Uy', address: 'Yunusobod, Amir Temur 108', latitude: 41.3667, longitude: 69.2841, isDefault: false });
  assert.equal(calls[1].url, 'https://api.formo.uz/api/addresses/5');
  assert.equal(calls[1].method, 'PATCH');
  assert.equal(calls[1].body.apartment, '');
  assert.equal(calls[1].body.isDefault, true);
  assert.ok(calls.every((c) => !c.url.includes('/api/api/')));
});

test('saveAddress server validatsiya xatosini yashirmaydi (soxta muvaffaqiyat yo\'q)', async () => {
  mockFetch([{ status: 400, body: { statusCode: 400, message: ['address must be longer than or equal to 5 characters'] } }]);
  await assert.rejects(saveAddress({ label: 'Uy', address: 'Yunusobod 1' }), (err) => err.status === 400 && /address must be/.test(err.message));
});

test('qidiruv: 3 belgidan qisqa so\'rov geokoderga yuborilmaydi, topilmasa null', async () => {
  const L = global.__stubs.location;
  L.forward = [{ latitude: 41.31, longitude: 69.24 }];
  assert.equal(await searchPlace('ab'), null);
  assert.deepEqual(await searchPlace('Chorsu'), { latitude: 41.31, longitude: 69.24 });
  L.forward = [];
  assert.equal(await searchPlace('Mavjud emas'), null);
});

// useDeviceLocation hook'i: React'siz sinash uchun uning locate() mantiqini to'g'ridan-to'g'ri chaqiramiz
test('GPS: ruxsat faqat locate() da so\'raladi; rad etish/bloklash/GPS o\'chiq holatlari', async () => {
  const React = require('react');
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const { useDeviceLocation } = require(src('features/location/index.js'));
  const L = global.__stubs.location;

  // Minimal hook muhiti: useState/useCallback/useEffect (effektlar ishga tushirilmaydi — dialog yo'q)
  const state = [];
  let i = 0;
  internals.H = {
    useState: (init) => { const k = i++; if (!(k in state)) state[k] = typeof init === 'function' ? init() : init; return [state[k], (v) => { state[k] = typeof v === 'function' ? v(state[k]) : v; }]; },
    useCallback: (fn) => fn,
    useEffect: () => {},
  };
  const useHookOnce = () => { i = 0; return useDeviceLocation(); };

  try {
    L.calls.length = 0;
    useHookOnce();
    assert.deepEqual(L.calls, [], 'ekran ochilganda hech narsa so\'ralmaydi');

    L.permission = { status: 'undetermined', canAskAgain: true };
    L.requestResult = { status: 'granted', canAskAgain: true };
    assert.deepEqual(await useHookOnce().locate(), { latitude: 41.3, longitude: 69.28 });
    assert.deepEqual(L.calls, ['getPermission', 'requestPermission', 'getCurrentPosition']);

    L.requestResult = { status: 'denied', canAskAgain: true };
    assert.equal(await useHookOnce().locate(), null);
    assert.equal(useHookOnce().error, 'locationDenied');
    assert.equal(useHookOnce().permission, 'denied');

    L.permission = { status: 'denied', canAskAgain: false };
    L.calls.length = 0;
    assert.equal(await useHookOnce().locate(), null);
    assert.equal(useHookOnce().permission, 'blocked');
    assert.ok(!L.calls.includes('requestPermission'), 'bloklangan ruxsat qayta so\'ralmaydi');

    L.permission = { status: 'granted', canAskAgain: true };
    L.servicesEnabled = false;
    assert.equal(await useHookOnce().locate(), null);
    assert.equal(useHookOnce().error, 'locationServicesOff');
    L.servicesEnabled = true;
  } finally {
    internals.H = null;
  }
});
