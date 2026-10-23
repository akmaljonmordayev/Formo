const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const React = require('react');
const { render, findAll, textOf } = require('./setup/render');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { Shirt, Shorts, patchKind } = require(src('components/ui/Shirt.js'));
const { JerseyPreview } = require(src('components/ui/JerseyPreview.js'));

// Dizayndagi (Formo Prototip / Shirt) tana yo'li — silueti o'zgarmasligi kerak
const DESIGN_BODY = 'M62 12 L84 4 Q100 16 116 4 L138 12 L192 42 L174 84 L152 74 L152 202 Q100 208 48 202 L48 74 L26 84 L8 42 Z';

const h = React.createElement;
const texts = (tree) => findAll(tree, 'Text').map((n) => ({ text: textOf(n), x: n.props.x, y: n.props.y, size: n.props.fontSize }));

test('forma silueti: dizayn viewBox va tana yo\'li, yeng manjetlari, yoqa', () => {
  const tree = render(h(Shirt, { color: '#1D2F8C', ink: '#F2A33A', side: 'back', width: 200 }));
  const [svg] = findAll(tree, 'Svg');
  assert.equal(svg.props.viewBox, '0 0 200 210');
  assert.equal(svg.props.height, 210);
  const bodies = findAll(tree, 'Path', (n) => n.props.d === DESIGN_BODY);
  assert.ok(bodies.some((n) => n.props.fill === '#1D2F8C'), 'tana klub rangida');
  assert.ok(findAll(tree, 'Path', (n) => n.props.d === 'M26 84 L8 42 L14 38 L32 80 Z').length === 1, 'chap manjet');
  assert.ok(findAll(tree, 'Path', (n) => n.props.d === 'M84 4 Q100 14 116 4').length === 1, 'orqa yoqa sayoz');
});

test('orqa tomon: ism yuqorida (katta harf), raqam markazda 90px', () => {
  const t = texts(render(h(Shirt, { side: 'back', player: 'aziz', number: '10' })));
  assert.deepEqual(t.find((x) => x.text === 'AZIZ'), { text: 'AZIZ', x: 100, y: 66, size: 22 });
  assert.deepEqual(t.find((x) => x.text === '10'), { text: '10', x: 100, y: 158, size: 90 });
  // Uzun ism kichikroq shriftda (yelkadan chiqmasin)
  const long = texts(render(h(Shirt, { side: 'back', player: 'Abdurahmonov', number: '7' })));
  assert.equal(long.find((x) => x.text === 'ABDURAHMONOV').size, 16);
});

test('old tomon: ko\'krakda kichik raqam, gerb kodi, ism yo\'q; V-yoqa', () => {
  const tree = render(h(Shirt, { side: 'front', player: 'AZIZ', number: '10', crest: 'rma' }));
  const t = texts(tree);
  assert.ok(!t.some((x) => x.text === 'AZIZ'), 'oldida ism chiqmaydi');
  assert.deepEqual(t.find((x) => x.text === '10'), { text: '10', x: 126, y: 64, size: 24 });
  assert.equal(t.find((x) => x.text === 'RMA').x, 76);
  assert.equal(findAll(tree, 'Path', (n) => n.props.d === 'M84 4 Q100 26 116 4').length, 1);
});

test('bo\'sh ism/raqam chizilmaydi (studiyada " " yuboriladi)', () => {
  assert.deepEqual(texts(render(h(Shirt, { side: 'back', player: ' ', number: '' }))), []);
});

test('gradient: noyob id bilan defs va tana url(#...) bilan bo\'yaladi', () => {
  const tree = render(h(Shirt, { grad: ['#F2A33A', '#E0662E'] }));
  const grads = findAll(tree, 'LinearGradient');
  const fillGrad = grads.find((g) => findAll(g.children, 'Stop').some((s) => s.props.stopColor === '#F2A33A'));
  assert.ok(fillGrad, 'gradient to\'xtash nuqtalari');
  assert.match(fillGrad.props.id, /^shirt[a-zA-Z0-9]+f$/, 'SVG id xavfsiz belgilardan');
  assert.ok(findAll(tree, 'Path', (n) => n.props.d === DESIGN_BODY && n.props.fill === `url(#${fillGrad.props.id})`).length === 1);
});

test('yamoqlar faqat old tomonda; studiya belgisi dizayn turiga moslanadi', () => {
  assert.equal(patchKind('C'), 'cap');
  assert.equal(patchKind('UZ'), 'flag');
  assert.equal(patchKind('★'), 'star');
  assert.equal(patchKind(null), null);
  const front = texts(render(h(Shirt, { side: 'front', patches: ['cap'] })));
  assert.ok(front.some((x) => x.text === 'C'), 'kapitan yamog\'i');
  const back = texts(render(h(Shirt, { side: 'back', patches: ['cap'] })));
  assert.ok(!back.some((x) => x.text === 'C'));
});

test('JerseyPreview mahsulot ma\'lumotini rendererga to\'g\'ri uzatadi va o\'lcham qutisini saqlaydi', () => {
  const product = { color: '#0E1A3F', accent: '#F2A33A', gradient: ['#080C24', '#152B75'], patch: 'UZ', code: 'PAK' };
  const tree = render(h(JerseyPreview, { product, number: '7', side: 'front', large: true }));
  const [box] = findAll(tree, 'View');
  assert.equal(box.props.style[0].width, 126);
  assert.equal(box.props.style[0].height, 152);
  assert.deepEqual(box.props.style[1], { transform: [{ scale: 1.35 }] });
  const t = texts(tree);
  assert.ok(t.some((x) => x.text === '7' && x.size === 24), 'old raqam');
  assert.ok(t.some((x) => x.text === 'PAK'), 'klub kodi gerbda');
  assert.ok(findAll(tree, 'Rect', (n) => n.props.fill === '#19A7A1').length === 1, 'bayroq yamog\'i');

  const back = texts(render(h(JerseyPreview, { product, number: '7', side: 'back', name: 'Formo' })));
  assert.ok(back.some((x) => x.text === 'FORMO' && x.y === 66));
  assert.ok(back.some((x) => x.text === '7' && x.size === 90));
});

test('shortik: dizayn viewBox, chap pochada raqam', () => {
  const tree = render(h(Shorts, { color: '#FFFFFF', trim: '#1D2F8C', number: '10', width: 160 }));
  assert.equal(findAll(tree, 'Svg')[0].props.viewBox, '0 0 160 116');
  assert.deepEqual(texts(tree), [{ text: '10', x: 42, y: 92, size: 28 }]);
  assert.deepEqual(texts(render(h(Shorts, { number: '' }))), []);
});
