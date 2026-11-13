// Bosh sahifa va Studio katalogidagi forma kartalari: eng ko'p sotilganlar va yoqtirilgan formalar.
// MOCK testlar (soxta fetch) — haqiqiy backend chaqirilmaydi.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { api } = require(src('services/api.js'));
const { matchesSearch, toKitCard } = require(src('features/products/kits.js'));

function mockFetch(responses) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, method: init.method });
    const r = responses.shift();
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  return calls;
}

const KIT = {
  id: 7,
  clubId: 3,
  label: 'Uy',
  title: 'Uy formasi',
  price: 189000,
  soldCount: 12,
  club: { id: 3, name: 'Real Madrid', code: 'RM', kit360Id: 'rm', category: { id: 2, name: 'LaLiga', slug: 'laliga' } },
};

test('toKitCard: forma + klub → karta (Forma 360° surati, turi, kategoriya, sotilgan soni)', () => {
  assert.deepEqual(
    { ...toKitCard(KIT), search: undefined },
    {
      key: 'kit:7',
      kitId: 7,
      clubId: 3,
      name: 'Real Madrid',
      label: 'Uy',
      price: 189000,
      kit360Id: 'rm',
      sleeve: 'SHORT',
      variant: 'f',
      kind: 'club',
      categoryName: 'LaLiga',
      categoryId: 2,
      soldCount: 12,
      search: undefined,
    },
  );
  // Uzun yengli forma: qishki karta (l0 surati); suratlari yo'q jamoada — kalta yeng surati
  const long = toKitCard({ ...KIT, sleeve: 'LONG' });
  assert.equal(long.sleeve, 'LONG');
  assert.equal(long.variant, 'l');
  assert.equal(toKitCard({ ...KIT, sleeve: 'LONG', club: { ...KIT.club, kit360Id: 'ars' } }).variant, 'f');
  // Uzun va kalta yengning yurakchalari alohida
  const { favKey } = require(src('features/products/kits.js'));
  assert.notEqual(favKey(long), favKey(toKitCard(KIT)));
  // Klub turi NATIONAL bo'lsa — terma jamoa
  assert.equal(toKitCard({ ...KIT, club: { ...KIT.club, kit360Id: null, type: 'NATIONAL', category: null } }).kind, 'national');
  // Forma 360° ro'yxatida bo'lmasa — tur kategoriya nomidan
  const national = toKitCard({ ...KIT, club: { ...KIT.club, kit360Id: null, category: { id: 9, name: 'Afrika terma jamoalari' } } });
  assert.equal(national.kind, 'national');
  assert.equal(toKitCard({ ...KIT, club: { ...KIT.club, kit360Id: 'es' } }).kind, 'national');
});

test('qidiruv: klub nomi, kodi va Forma 360° nomi bo‘yicha, katta-kichik harf farqsiz', () => {
  const card = toKitCard(KIT);
  assert.equal(matchesSearch(card, ''), true);
  assert.equal(matchesSearch(card, 'real'), true);
  assert.equal(matchesSearch(card, '  RM '), true);
  assert.equal(matchesSearch(card, 'barsa'), false);
});

test('API: eng ko‘p sotilganlar (kit360) va formani yoqtirish yo‘llari', async () => {
  const calls = mockFetch([
    { status: 200, body: [KIT] },
    { status: 200, body: [KIT] },
    { status: 200, body: { kitId: 7, isFavorite: true } },
    { status: 200, body: { kitId: 7, isFavorite: false } },
  ]);
  assert.deepEqual(await api.catalog.bestSellingKits(50), [KIT]);
  await api.catalog.favoriteKits();
  await api.catalog.addFavoriteKit(7);
  await api.catalog.removeFavoriteKit(7);
  assert.deepEqual(
    calls.map((c) => [c.method, c.url.replace('https://api.formo.uz/api', '')]),
    [
      ['GET', '/catalog/kits/best-selling?limit=50&kit360=true'],
      ['GET', '/catalog/favorite-kits'],
      ['PUT', '/catalog/kits/7/favorite'],
      ['DELETE', '/catalog/kits/7/favorite'],
    ],
  );
});

test('mixKits: formalar aralashadi (bir xil seed — bir xil tartib), hech biri yo\'qolmaydi, bir jamoa yonma-yon tushmaydi', () => {
  const { mixKits } = require(src('features/products/kits.js'));
  const teams = ['rm', 'fcb', 'mu', 'ars', 'liv', 'psg', 'uzb', 'arg'];
  // Serverdagi tartib: avval barcha kalta yenglilar, oxirida uzun yenglilar (ilovada "shalvarlar bir joyda" muammosi)
  const list = [
    ...teams.map((id) => ({ key: `kit:${id}`, kit360Id: id, sleeve: 'SHORT' })),
    ...teams.map((id) => ({ key: `kit:${id}:l`, kit360Id: id, sleeve: 'LONG' })),
  ];
  const mixed = mixKits(list, 42);
  assert.deepEqual(mixKits(list, 42), mixed);
  assert.deepEqual(mixed.map((k) => k.key).sort(), list.map((k) => k.key).sort());
  assert.notDeepEqual(mixed.map((k) => k.key), list.map((k) => k.key));
  // Uzun yenglilar endi oxirida to'planib turmaydi
  assert.ok(mixed.slice(0, 8).some((k) => k.sleeve === 'LONG') && mixed.slice(8).some((k) => k.sleeve === 'SHORT'));
  assert.ok(mixed.every((k, i) => i === 0 || k.kit360Id !== mixed[i - 1].kit360Id));
  assert.deepEqual(mixKits([], 1), []);
});
