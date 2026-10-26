const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const React = require('react');
const { render, findAll, textOf } = require('./setup/render');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { designPreview, designText, estimatePrice, TEXT_COLORS } = require(src('features/studio/index.js'));
const { Shirt, Shorts } = require(src('components/ui/Shirt.js'));

const h = React.createElement;
const PRICES = { custom: 129000, gradient: 30000, patch: 10000, gift: 15000, shorts: 60000 };
const base = { color: { type: 'solid', id: 'qora' }, font: 'sport', patch: null, package: 'oddiy-paket' };

test('yozuv rangi: tanlangan rang ustun, aks holda fon rangiga qarab avtomatik', () => {
  assert.equal(designPreview(base).accent, '#F3F5F9');
  assert.equal(designPreview({ ...base, textColor: 'oltin' }).accent, TEXT_COLORS.find((c) => c.id === 'oltin').hex);
  assert.equal(designPreview({ ...base, textColor: 'nomalum' }).accent, '#F3F5F9');
});

test('neon effekt preview va tavsifga tushadi', () => {
  assert.equal(designPreview(base).glow, false);
  assert.equal(designPreview({ ...base, textEffect: 'neon' }).glow, true);
  const t = (k) => k;
  assert.match(designText(t, { ...base, textColor: 'oltin', textEffect: 'neon' }), /textColorShort — tcolor_oltin · neonEffect/);
});

test('taxminiy narx: shortik qo‘shilsa server narxi qo‘shiladi; eski config (shorts yo‘q) buzilmaydi', () => {
  assert.equal(estimatePrice(base, PRICES), 129000);
  assert.equal(estimatePrice(base, PRICES, true), 189000);
  const { shorts, ...old } = PRICES; // eslint-disable-line no-unused-vars
  assert.equal(estimatePrice(base, old, true), 129000);
});

test('neon yozuv: har bir matn 3 qatlam (porlash + oq o‘zak), oddiysi 1 qatlam', () => {
  const plain = findAll(render(h(Shirt, { side: 'back', player: 'AZIZ', number: '10', ink: '#D4AF37' })), 'Text');
  assert.equal(plain.length, 2);
  const neon = findAll(render(h(Shirt, { side: 'back', player: 'AZIZ', number: '10', ink: '#D4AF37', glow: true })), 'Text');
  assert.equal(neon.length, 6);
  const core = neon.filter((n) => n.props.fill === '#FFFFFF');
  assert.deepEqual(core.map(textOf).sort(), ['10', 'AZIZ']);
  assert.ok(neon.some((n) => n.props.stroke === '#D4AF37' && n.props.strokeOpacity < 1));
});

test('shortik raqami neon bilan ham chiziladi', () => {
  const texts = findAll(render(h(Shorts, { number: '7', ink: '#4ADE80', glow: true })), 'Text');
  assert.equal(texts.length, 3);
  assert.ok(texts.every((n) => textOf(n) === '7'));
});
