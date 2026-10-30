const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { kit360Team, kit360Message, parseKit360Message, KIT360_SOURCE } = require(src('features/kit360/index.js'));
const viewerHtml = require(src('components/ui/kit360/viewerHtml.js')).default;

test("kit360Team: katalogdagi klub nomi/kodi → foto-360° jamoasi (lotin, kirill, inglizcha)", () => {
  assert.equal(kit360Team({ clubName: 'Real Madrid', name: 'Real Madrid · Uy' }), 'rm');
  assert.equal(kit360Team({ clubName: 'Manchester United' }), 'mu');
  assert.equal(kit360Team({ clubName: 'Манчестер Сити' }), 'mci');
  assert.equal(kit360Team({ clubName: 'PSJ' }), 'psg');
  assert.equal(kit360Team({ clubName: 'Ispaniya' }), 'es');
  assert.equal(kit360Team({ code: 'FCB' }), 'fcb');
  assert.equal(kit360Team({ name: 'Argentina · Uy' }), 'ar');
});

test("kit360Team: suratlari yo'q klub — null (3D ko'rinish qoladi)", () => {
  assert.equal(kit360Team({ clubName: 'Pakhtakor', code: 'PAK' }), null);
  assert.equal(kit360Team(null), null);
});

test("kit360Team: backend kit360Id ustun — nom boshqacha bo'lsa ham; null — admin bog'lamagan, nom bo'yicha moslanmaydi", () => {
  const { toProduct } = require(src('features/products/index.js'));
  const kit = { id: 5, label: 'Uy', bgColor: '#fff', textColor: '#000' };
  assert.equal(kit360Team(toProduct(kit, { id: 1, name: 'Los Blancos', kit360Id: 'rm' })), 'rm');
  assert.equal(kit360Team(toProduct(kit, { id: 1, name: 'Real Madrid', kit360Id: null })), null);
  // Eski API (maydon yo'q) — nom bo'yicha zaxira
  assert.equal(kit360Team(toProduct(kit, { id: 1, name: 'Real Madrid' })), 'rm');
  assert.equal(kit360Team({ kit360Id: 'xx', clubName: 'Real Madrid' }), null);
});

test('xabarlar: update va javoblar formo-kit360 belgisi bilan, boshqa postMessage tashlanadi', () => {
  const msg = JSON.parse(kit360Message({ team: 'rm', name: 'ISROIL', number: 10, side: 'front' }));
  assert.deepEqual(msg, { source: KIT360_SOURCE, type: 'update', team: 'rm', name: 'ISROIL', number: '10', side: 'front' });
  assert.equal(JSON.parse(kit360Message({ team: 'rm' })).side, 'back');
  assert.deepEqual(parseKit360Message(JSON.stringify({ source: KIT360_SOURCE, type: 'face', view: 'front' })), {
    source: KIT360_SOURCE,
    type: 'face',
    view: 'front',
  });
  assert.equal(parseKit360Message('{"source":"formo-kit","type":"ready"}'), null);
  assert.equal(parseKit360Message('not json'), null);
});

test("viewer.html: 10 jamoaning 8 tadan kadri ichida (data: URL), tashqi skript yo'q", () => {
  const frames = JSON.parse(viewerHtml.match(/window\.FORMO_FRAMES=(\{.*?\})<\/script>/s)[1]);
  assert.deepEqual(Object.keys(frames).sort(), ['ar', 'en', 'es', 'fcb', 'fr', 'mci', 'mu', 'psg', 'pt', 'rm']);
  for (const list of Object.values(frames)) {
    assert.equal(list.length, 8);
    for (const url of list) assert.ok(url.startsWith('data:image/jpeg;base64,'));
  }
  assert.ok(!/<script[^>]+src=/i.test(viewerHtml));
});
