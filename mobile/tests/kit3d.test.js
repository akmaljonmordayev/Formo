const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const kit3d = require(src('features/kit3d/index.js'));
const { itemPreview } = require(src('features/studio/index.js'));
const { assetUrl } = require(src('services/api.js'));
const viewerHtml = require(src('components/ui/kit3d/viewerHtml.js')).default;

test('toHex6: 3 xonali hex kengaytiriladi, noto‘g‘ri qiymat — fallback', () => {
  assert.equal(kit3d.toHex6('#FFF', '#000000'), '#ffffff');
  assert.equal(kit3d.toHex6('#1A3582', '#000000'), '#1a3582');
  assert.equal(kit3d.toHex6('red', '#000000'), '#000000');
  assert.equal(kit3d.toHex6(undefined, '#123456'), '#123456');
});

test('klub formasi → v1 dizayn: rang, yozuv rangi, nishonda klub kodi', () => {
  const d = kit3d.clubKitDesign({ color: '#FFF', accent: '#1D2F8C', code: 'RM' });
  assert.deepEqual(d, {
    designVersion: 1,
    name: 'RM',
    primaryColor: '#ffffff',
    secondaryColor: '#1d2f8c',
    textColor: '#1d2f8c',
    pattern: 'plain',
    neck: 'round',
    sponsorText: '',
    backTopText: '',
    crestImageUrl: null,
    sponsorImageUrl: null,
  });
});

test("o'z rangim → v1: bir rang — plain, gradient — fade", () => {
  assert.equal(kit3d.studioKitDesign({ color: '#2A3FB0', accent: '#F3F5F9' }).pattern, 'plain');
  const g = kit3d.studioKitDesign({ color: '#F2A33A', accent: '#F3F5F9', gradient: ['#F2A33A', '#D63A45'] });
  assert.deepEqual([g.pattern, g.primaryColor, g.secondaryColor], ['fade', '#f2a33a', '#d63a45']);
});

test("rasm manzili: lokal '/api/uploads/...' API origin'iga qo'shiladi, S3 URL o'zgarmaydi", () => {
  assert.match(assetUrl('/api/uploads/kits/crest/a.png'), /^https?:\/\/[^/]+\/api\/uploads\/kits\/crest\/a\.png$/);
  assert.doesNotMatch(assetUrl('/api/uploads/x.png'), /\/api\/api\//);
  assert.equal(assetUrl('https://cdn.formo.uz/kits/a.png'), 'https://cdn.formo.uz/kits/a.png');
  assert.equal(assetUrl(null), null);
  const d = kit3d.withAssetUrls({ crestImageUrl: '/api/uploads/c.png', sponsorImageUrl: null });
  assert.match(d.crestImageUrl, /^https?:\/\//);
  assert.equal(d.sponsorImageUrl, null);
});

test('viewer xabarlari: faqat formo-kit belgili xabarlar qabul qilinadi', () => {
  const raw = kit3d.viewerMessage({ backName: 'ALI' });
  assert.deepEqual(JSON.parse(raw), { source: 'formo-kit', type: 'update', props: { backName: 'ALI' } });
  assert.deepEqual(kit3d.parseViewerMessage('{"source":"formo-kit","type":"face","view":"back"}'), {
    source: 'formo-kit',
    type: 'face',
    view: 'back',
  });
  assert.equal(kit3d.parseViewerMessage('{"source":"other","type":"ready"}'), null);
  assert.equal(kit3d.parseViewerMessage('not json'), null);
  assert.equal(kit3d.parseViewerMessage(null), null);
});

test('orqa yozuv: 12 belgigacha, raqam faqat 2 ta raqam', () => {
  assert.deepEqual(kit3d.printProps('  rahimov  ', '1a0'), { backName: 'rahimov', number: '10' });
  assert.equal(kit3d.printProps('abcdefghijklmnop', '').backName.length, 12);
  assert.equal(kit3d.printProps(null, '123').number, '12');
});

test("mobil sozlamalari: 1024 px tekstura, 80 ms debounce", () => {
  assert.equal(kit3d.MOBILE_TEXTURE_SIZE, 1024);
  assert.equal(kit3d.UPDATE_DEBOUNCE_MS, 80);
});

test("savat/buyurtma preview: 3D dizayn ranglari (savatda kitDesign, buyurtmada designSnapshot)", () => {
  const design = { primaryColor: '#a3122b', textColor: '#ffffff' };
  assert.deepEqual(itemPreview({ kitDesign: { design } }), { color: '#a3122b', accent: '#ffffff' });
  assert.deepEqual(itemPreview({ designSnapshot: design }), { color: '#a3122b', accent: '#ffffff' });
});

test("viewer.html ilova ichida: tashqi skript/stil/shrift yuklanmaydi, protokol belgisi bor", () => {
  assert.ok(viewerHtml.length > 100000, 'three.js ichida bo‘lishi kerak');
  assert.doesNotMatch(viewerHtml, /<script[^>]+src=/i);
  assert.doesNotMatch(viewerHtml, /<link[^>]+href=/i);
  assert.doesNotMatch(viewerHtml, /fonts\.googleapis|cdnjs|jsdelivr|unpkg/);
  assert.match(viewerHtml, /formo-kit/);
  assert.match(viewerHtml, /data:font\/woff2;base64,/);
});
