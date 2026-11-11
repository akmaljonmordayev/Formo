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
  const ok = {
    label: 'Uy',
    address: 'Yunusobod, Amir Temur 108',
    apartment: '45',
    region: 'TOSHKENT_SHAHRI',
    district: 'Yunusobod tumani',
    house: '108',
    coords: { latitude: 41.36, longitude: 69.28 },
  };
  assert.deepEqual(loc.validateAddressForm(ok), {});
  assert.equal(loc.validateAddressForm({ ...ok, label: ' ' }).label, 'addrLabelInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, label: 'x'.repeat(31) }).label, 'addrLabelInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, address: 'abcd' }).address, 'addrTextInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, apartment: 'x'.repeat(61) }).apartment, 'addrApartmentInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, address: '<script>alert(1)</script>' }).address, 'invalidValue');
  assert.equal(loc.validateAddressForm({ ...ok, coords: { latitude: 120, longitude: 0 } }).coords, 'locationInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, region: undefined }).region, 'addrRegionInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, region: 'MARS' }).region, 'addrRegionInvalid');
  // Aniq manzil: tuman shu viloyatniki bo'lishi va uy raqami majburiy
  assert.equal(loc.validateAddressForm({ ...ok, district: undefined }).district, 'addrDistrictInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, district: 'Urgut tumani' }).district, 'addrDistrictInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, house: ' ' }).house, 'addrHouseInvalid');
  assert.equal(loc.validateAddressForm({ ...ok, house: 'x'.repeat(21) }).house, 'addrHouseInvalid');
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
  // Viloyat: faqat tanish kod yuboriladi
  assert.equal(loc.toAddressPayload({ label: 'Uy', address: 'Mirobod 7-uy', region: 'TOSHKENT_SHAHRI' }).region, 'TOSHKENT_SHAHRI');
  assert.equal(loc.toAddressPayload({ label: 'Uy', address: 'Mirobod 7-uy', region: 'MARS' }).region, undefined);
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

test('saveAddress keshdagi manzillar ro‘yxatini yangilaydi (checkout yangi manzilni ko‘radi)', async () => {
  const cache = require(src('utils/memCache.js'));
  cache.setCached('addresses', [{ id: 1, label: 'Uy', isDefault: true }]);
  mockFetch([{ status: 201, body: { id: 9, label: 'Ish', isDefault: true } }]);
  await saveAddress({ label: 'Ish', address: 'Chilonzor 12 kvartal', coords: { latitude: 41.28, longitude: 69.2 }, isDefault: true });
  assert.deepEqual(cache.getCached('addresses'), [
    { id: 1, label: 'Uy', isDefault: false },
    { id: 9, label: 'Ish', isDefault: true },
  ]);
  cache.clearCache();
});

// ─── Viloyat → tuman → xarita → aniq manzil ─────────────────────────────────────────────────────────────────────────

test('tumanlar: har viloyatda ro\'yxat bor, nomlar to\'liq ("... tumani" / "... shahri") va takrorlanmaydi', () => {
  const { DISTRICTS, districtsOf, isDistrictOf, areaOf, REGION_AREAS } = require(src('features/location/districts.js'));
  assert.deepEqual(Object.keys(DISTRICTS).sort(), [...loc.REGION_CODES].sort());
  for (const code of loc.REGION_CODES) {
    const names = districtsOf(code).map((d) => d.name);
    assert.ok(names.length >= 10, code);
    assert.equal(new Set(names).size, names.length, `${code}: takror`);
    assert.ok(names.every((n) => / (tumani|shahri)$/.test(n) && n.length <= loc.ADDRESS_LIMITS.district), code);
    assert.ok(REGION_AREAS[code], code);
  }
  assert.equal(districtsOf('TOSHKENT_SHAHRI').length, 12);
  assert.ok(isDistrictOf('TOSHKENT_SHAHRI', 'Sergeli tumani'));
  assert.ok(isDistrictOf('TOSHKENT_VILOYATI', 'Nurafshon shahri'));
  assert.ok(!isDistrictOf('SAMARQAND', 'Sergeli tumani'));
  assert.deepEqual(districtsOf('MARS'), []);
  // Toshkent shahri tumani — tuman markazi (tarmoqsiz ham xarita o'sha yerda ochiladi); boshqa viloyat — viloyat hududi
  const sergeli = areaOf('TOSHKENT_SHAHRI', 'Sergeli tumani');
  assert.ok(Math.abs(sergeli.latitude - 41.2234) < 0.01 && sergeli.latitudeDelta < 0.1);
  assert.ok(areaOf('SAMARQAND', 'Urgut tumani').latitudeDelta > 1);
});

test('to\'liq manzil: viloyat, tuman, mahalla, uy, xonadon — takrorsiz; eski manzil o\'zgarishsiz', () => {
  const t = (key) => ({ region_TOSHKENT_SHAHRI: 'Toshkent shahri' })[key] || key;
  const a = { region: 'TOSHKENT_SHAHRI', district: 'Sergeli tumani', address: 'Madadkor mahallasi', house: '32', apartment: '45-xonadon' };
  assert.equal(loc.formatFullAddress(a, t), 'Toshkent shahri, Sergeli tumani, Madadkor mahallasi, 32-uy, 45-xonadon');
  // Matnda tuman allaqachon yozilgan — takrorlanmaydi; so'z bilan yozilgan uy o'zgarmaydi
  assert.equal(
    loc.formatFullAddress({ ...a, address: 'Sergeli tumani, Madadkor mahallasi', house: '32-dom', apartment: '' }, t),
    'Toshkent shahri, Sergeli tumani, Madadkor mahallasi, 32-dom',
  );
  assert.equal(loc.formatFullAddress({ address: 'Yunusobod, Amir Temur 108', apartment: '45-xonadon' }, t), 'Yunusobod, Amir Temur 108, 45-xonadon');
  assert.equal(loc.houseLabel('12A'), '12A-uy');
  assert.equal(loc.houseLabel('12/4'), '12/4-uy');
  assert.equal(loc.houseLabel(''), '');
});

test('nuqta tekshiruvi: O\'zbekistondan tashqari yoki Toshkent shahri tanlanib nuqta uzoqda — rad etiladi', () => {
  assert.equal(loc.pointProblem('TOSHKENT_SHAHRI', { latitude: 41.2234, longitude: 69.2219 }), null);
  assert.equal(loc.pointProblem('TOSHKENT_SHAHRI', { latitude: 39.6542, longitude: 66.9597 }), 'locationOutsideTashkent');
  assert.equal(loc.pointProblem('SAMARQAND', { latitude: 39.6542, longitude: 66.9597 }), null);
  assert.equal(loc.pointProblem('SAMARQAND', { latitude: 55.75, longitude: 37.61 }), 'locationOutsideCountry');
  assert.equal(loc.pointProblem('SAMARQAND', null), 'locationPickPoint');
});

test('POST tanasi: tuman faqat shu viloyatniki bo\'lsa, uy raqami bilan birga yuboriladi', () => {
  const base = { label: 'Uy', address: 'Madadkor mahallasi', region: 'TOSHKENT_SHAHRI', house: ' 32 ' };
  assert.deepEqual(loc.toAddressPayload({ ...base, district: 'Sergeli tumani' }), {
    label: 'Uy',
    address: 'Madadkor mahallasi',
    region: 'TOSHKENT_SHAHRI',
    district: 'Sergeli tumani',
    house: '32',
  });
  assert.equal(loc.toAddressPayload({ ...base, district: 'Urgut tumani' }).district, undefined);
});

test('yetkazish turi: viloyat — pochta, Toshkent shahri — kuryer; eski manzil nuqtasi bo\'yicha', () => {
  const { isPostalDelivery } = require(src('features/location/tashkent.js'));
  assert.equal(isPostalDelivery({ region: 'SAMARQAND' }), true);
  assert.equal(isPostalDelivery({ region: 'TOSHKENT_VILOYATI', latitude: 41.31, longitude: 69.28 }), true);
  assert.equal(isPostalDelivery({ region: 'TOSHKENT_SHAHRI', latitude: 41.31, longitude: 69.28 }), false);
  assert.equal(isPostalDelivery({ latitude: 41.4689, longitude: 69.5822 }), true);
  assert.equal(isPostalDelivery({ latitude: 41.31, longitude: 69.28 }), false);
  assert.equal(isPostalDelivery({}), false);
  assert.equal(isPostalDelivery(null), false);
});

test('geokod: nuqtadan mahalla/ko\'cha va uy; natija nomi qisqartiriladi; tuman hududi', () => {
  const geo = require(src('features/location/geocode.js'));
  assert.deepEqual(geo.formatReverse({ neighbourhood: 'Sergeli-8', road: "Yangi Sirg'ali ko'chasi", house_number: '8/2' }), {
    text: "Sergeli-8, Yangi Sirg'ali ko'chasi",
    house: '8/2',
  });
  assert.deepEqual(geo.formatReverse(null), { text: '', house: '' });
  assert.deepEqual(geo.splitDisplayName("Madadkor mahallasi, Sergeli tumani, Toshkent, 100000, O'zbekiston"), {
    title: 'Madadkor mahallasi, Sergeli tumani',
    subtitle: 'Toshkent',
  });
  // Chegara qutisi — markazi va kengligi; bitta nuqta — atrofidagi taxminiy hudud; butun mamlakatdek quti — yaroqsiz
  const box = geo.boxToArea(['39.25', '39.56', '66.80', '67.50'], 39.4, 67.24);
  assert.ok(Math.abs(box.latitude - 39.405) < 1e-9 && box.longitudeDelta > 0.7);
  assert.equal(geo.boxToArea(['43.04', '43.045', '58.84', '58.85'], 43.0444, 58.846).latitudeDelta, 0.3);
  assert.equal(geo.boxToArea(['37', '45', '56', '73'], 41, 64), null);
  assert.equal(geo.boxToArea(null), null);
});

test('qidiruv bosqichlari: tuman ichida topilmasa — qurilma geokoderi, keyin butun mamlakat', async () => {
  const geo = require(src('features/location/geocode.js'));
  geo.resetGeocodeThrottle();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(decodeURIComponent(url));
    return { ok: true, status: 200, json: async () => [] };
  };
  const hits = await geo.searchPlaces('Madadkor', {
    context: 'Sergeli tumani, Toshkent shahri',
    fallback: async (q) => [{ id: 'device', title: q, subtitle: '', latitude: 41.22, longitude: 69.22 }],
  });
  assert.equal(hits[0].id, 'device');
  assert.equal(urls.length, 1);
  assert.ok(urls[0].includes('q=Madadkor, Sergeli tumani, Toshkent shahri') && urls[0].includes('countrycodes=uz'));
  // 3 belgidan qisqa so'rov tarmoqqa chiqmaydi
  assert.deepEqual(await geo.searchPlaces('ab', {}), []);
  assert.equal(urls.length, 1);
});

test('qidiruv: tanlangan viloyatdan tashqaridagi natijalar ko\'rsatilmaydi', async () => {
  const geo = require(src('features/location/geocode.js'));
  const { areaOf } = require(src('features/location/districts.js'));
  geo.resetGeocodeThrottle();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(decodeURIComponent(url));
    // OSM faqat Farg'onadagi Madadkor mahallasini topadi
    return { ok: true, status: 200, json: async () => [{ place_id: 1, lat: '40.379', lon: '71.810', display_name: "Madadkor mahallasi, Farg'ona shahri" }] };
  };
  const hits = await geo.searchPlaces('Madadkor', {
    context: 'Sergeli tumani, Toshkent shahri',
    region: 'Toshkent shahri',
    bounds: areaOf('TOSHKENT_SHAHRI'),
  });
  assert.deepEqual(hits, []);
  // Oxirgi bosqich ham butun mamlakat emas — viloyat nomi bilan
  assert.ok(urls[urls.length - 1].includes('q=Madadkor, Toshkent shahri'));
  assert.ok(geo.isInside(areaOf('TOSHKENT_SHAHRI'), { latitude: 41.2234, longitude: 69.2219 }));
});
