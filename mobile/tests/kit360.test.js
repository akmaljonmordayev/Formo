const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { kit360Team, kit360Message, parseKit360Message, KIT360_SOURCE, KIT360_TEAMS, KIT360_IDS, KIT360_LONG, findKit360Team } = require(src('features/kit360/index.js'));
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
  // Yonga burilgan (viewer 'side' xabar qilgan) — tomon buyrug'i yo'q, keyingi "Old" bosilishi holatni o'zgartiradi
  assert.equal(JSON.parse(kit360Message({ team: 'rm', side: 'side' })).side, null);
  // Shortik raqami: berilmasa — kalit yo'q (viewer orqadagi raqamni chizadi); '' — shortik raqamsiz
  assert.equal('shortsNumber' in JSON.parse(kit360Message({ team: 'rm', number: 10 })), false);
  assert.equal(JSON.parse(kit360Message({ team: 'rm', number: 10, shortsNumber: '' })).shortsNumber, '');
  assert.equal(JSON.parse(kit360Message({ team: 'rm', number: 10, shortsNumber: 10 })).shortsNumber, '10');
  assert.deepEqual(parseKit360Message(JSON.stringify({ source: KIT360_SOURCE, type: 'face', view: 'front' })), {
    source: KIT360_SOURCE,
    type: 'face',
    view: 'front',
  });
  assert.equal(parseKit360Message('{"source":"formo-kit","type":"ready"}'), null);
  assert.equal(parseKit360Message('not json'), null);
});

test("viewer.html: har jamoaning (KIT360_IDS) 8 tadan kadri ichida (data: URL), tashqi skript yo'q", () => {
  const frames = JSON.parse(viewerHtml.match(/window\.FORMO_FRAMES=(\{.*?\})<\/script>/s)[1]);
  assert.deepEqual(Object.keys(frames).sort(), [...KIT360_IDS].sort());
  // { f: kalta yeng, l?: uzun yeng } — har biri 8 kadr
  for (const [id, sets] of Object.entries(frames)) {
    assert.deepEqual(Object.keys(sets).sort(), KIT360_LONG.includes(id) ? ['f', 'l'] : ['f']);
    for (const list of Object.values(sets)) {
      assert.equal(list.length, 8);
      for (const url of list) assert.ok(url.startsWith('data:image/jpeg;base64,'));
    }
  }
  assert.ok(!/<script[^>]+src=/i.test(viewerHtml));
});

test('uzun yeng: KIT360_LONG viewer build (thumbs.js → LONG_TEAMS) va backend KIT360_LONG_IDS bilan bir xil', () => {
  const fs = require('fs');
  const thumbs = fs.readFileSync(src('components/ui/kit360/thumbs.js'), 'utf8');
  assert.deepEqual(JSON.parse(thumbs.match(/LONG_TEAMS = (\[.*?\]);/)[1]), [...KIT360_LONG].sort());
  const backend = fs.readFileSync(path.join(__dirname, '..', '..', 'backend', 'src', 'kits', 'kit360.ts'), 'utf8');
  const ids = JSON.parse(backend.match(/KIT360_LONG_IDS[^=]*= (\[.*?\]);/)[1].replace(/'/g, '"'));
  assert.deepEqual([...ids].sort(), [...KIT360_LONG].sort());
});

test("forma turi: kit360Variant, itemVariant (savat kit.sleeve / buyurtma sleeve) va xabardagi variant", () => {
  const { kit360Variant, itemVariant } = require(src('features/kit360/index.js'));
  assert.equal(kit360Variant('rm', 'LONG'), 'l');
  assert.equal(kit360Variant('rm', 'SHORT'), 'f');
  assert.equal(kit360Variant('ars', 'LONG'), 'f'); // uzun yeng suratlari yo'q
  assert.equal(itemVariant({ club: { kit360Id: 'fcb' }, kit: { sleeve: 'LONG' } }), 'l');
  assert.equal(itemVariant({ kit360Id: 'fcb', sleeve: 'LONG' }), 'l');
  assert.equal(itemVariant({ kit360Id: 'fcb' }), 'f');
  assert.equal(JSON.parse(kit360Message({ team: 'rm', variant: 'l' })).variant, 'l');
  assert.equal('variant' in JSON.parse(kit360Message({ team: 'rm', variant: 'f' })), false);
});

test('bosma matni: cleanPrintName (apostrof, kirill) va cleanPrintNumber ("0", max)', () => {
  const { cleanPrintName, cleanPrintNumber } = require(src('features/kit360/index.js'));
  assert.equal(cleanPrintName("o`ktam"), "O'KTAM");
  assert.equal(cleanPrintName('ҚОДИРОВ 7'), 'ҚОДИРОВ ');
  assert.equal(cleanPrintNumber('0'), '0');
  assert.equal(cleanPrintNumber('07'), '7');
  assert.equal(cleanPrintNumber('150', 99), '99');
});

test("KIT360_TEAMS: 18 ta jamoa (7 terma jamoa, 11 klub), to'liq ma'lumotlar bilan", () => {
  assert.equal(KIT360_TEAMS.length, 18);
  const ids = KIT360_TEAMS.map((t) => t.id).sort();
  assert.deepEqual(ids, ['ar', 'ars', 'atm', 'che', 'de', 'en', 'es', 'fcb', 'fr', 'juv', 'lfc', 'mci', 'mu', 'psg', 'pt', 'rm', 'rom', 'uz']);
  const nationals = KIT360_TEAMS.filter((t) => t.kind === 'national');
  const clubs = KIT360_TEAMS.filter((t) => t.kind === 'club');
  assert.equal(nationals.length, 7);
  assert.equal(clubs.length, 11);
  assert.deepEqual([...KIT360_IDS].sort(), ids); // aliaslar va ro'yxat bir xil
  assert.equal(findKit360Team('rm').name, 'Real Madrid');
  assert.equal(findKit360Team('fcb').name, 'Barselona');
  assert.ok(findKit360Team('unknown')); // fallback
});

test("savat/buyurtma qatori → karta surati: savatda club.kit360Id, buyurtmada kit360Id; noma'lum — null", () => {
  const { itemKit360 } = require(src('features/kit360/index.js'));
  assert.equal(itemKit360({ club: { kit360Id: 'psg' } }), 'psg');
  assert.equal(itemKit360({ kit360Id: 'mu' }), 'mu');
  // Eski maxsus dizayn / bog'lanmagan klub / noma'lum id — joy egasi ko'rsatiladi
  assert.equal(itemKit360({ design: { color: {} }, club: null }), null);
  assert.equal(itemKit360({ kit360Id: 'xx' }), null);
  assert.equal(itemKit360(null), null);
});

test("karta suratlari: har jamoaga old tomon (f0) fayli bor va thumbs.js ularning hammasini require qiladi", () => {
  const fs = require('fs');
  const { KIT360_IDS } = require(src('features/kit360/index.js'));
  const thumbs = fs.readFileSync(src('components/ui/kit360/thumbs.js'), 'utf8');
  for (const id of KIT360_IDS) {
    assert.ok(thumbs.includes(`require('../../../../assets/kit360/${id}.jpg')`), id);
    assert.ok(fs.statSync(path.join(__dirname, '..', 'assets', 'kit360', `${id}.jpg`)).size > 1000, `${id}.jpg`);
  }
});

test('katalog API: klublar, mashhurlar va ligalar faqat Forma 360° klublari bilan so‘raladi (kit360=true)', async () => {
  const { catalog } = require(src('services/api.js'));
  const urls = [];
  global.fetch = async (url) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => ({ items: [] }) };
  };
  await catalog.clubs({ categoryId: 3, search: 'real' });
  await catalog.popular(8);
  await catalog.categories();
  assert.match(urls[0], /\/catalog\/clubs\?categoryId=3&search=real&kit360=true$/);
  assert.match(urls[1], /\/catalog\/clubs\/popular\?limit=8&kit360=true$/);
  assert.match(urls[2], /\/catalog\/categories\?kit360=true$/);
});
