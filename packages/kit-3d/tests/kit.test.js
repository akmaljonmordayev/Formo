import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKit } from '../src/geometry.js';
import { BOUNDS, buildOutline, depth } from '../src/outline.js';
import { crestInitials, drawKitTextures } from '../src/textures.js';
import { fakeCanvasFactory, textsOf } from './fake-canvas.js';

const design = { name: 'Turon FC', primaryColor: '#1f6f8b', secondaryColor: '#0b1d2a', textColor: '#e3c27a', pattern: 'fade', sponsorText: 'Karvon' };

test('buildKit: old/orqa panel, 2 ichki qatlam, yoqa, 2 manjet va etak', () => {
  const kit = buildKit(design);
  assert.equal(kit.group.children.length, 8);
  const [front, back, inFront, inBack] = kit.group.children;
  // ichki tomon — o'sha geometriya, boshqa material
  assert.equal(inFront.geometry, front.geometry);
  assert.equal(inBack.geometry, back.geometry);
  assert.notEqual(inFront.material, front.material);
  front.geometry.computeBoundingBox();
  const box = front.geometry.boundingBox;
  assert.ok(box.min.x >= BOUNDS.minX - 1e-6 && box.max.x <= BOUNDS.maxX + 1e-6);
  assert.ok(box.min.y >= BOUNDS.minY - 1e-6 && box.max.y <= BOUNDS.maxY + 1e-6);
  kit.dispose();
});

test("buildKit: yoqa turi o'zgarsa geometriya qayta quriladi, rang o'zgarsa yo'q", () => {
  const kit = buildKit(design);
  const before = kit.group.children[0].geometry;
  kit.update({ ...design, primaryColor: '#a3122b' });
  assert.equal(kit.group.children[0].geometry, before);
  kit.update({ ...design, neck: 'v' });
  assert.notEqual(kit.group.children[0].geometry, before);
  assert.equal(kit.neck, 'v');
  kit.dispose();
});

test('ichki tomon rangi asosiy rangdan to\'qroq', () => {
  const kit = buildKit({ ...design, primaryColor: '#ffffff' });
  const c = kit.materials.inside.color;
  assert.ok(c.r < 0.5 && c.g < 0.5 && c.b < 0.5);
  kit.dispose();
});

test("depth: old tomon oldinga, orqa orqaga bo'rtadi; choklarda nolga yaqin", () => {
  assert.ok(depth(0, 0, false) > 0.2);
  assert.ok(depth(0, 0, true) < -0.15);
  assert.ok(Math.abs(depth(0.6, 1.04, false)) < 0.02); // yelka choki
});

test('V-yoqa dumaloq yoqadan pastroq kesilgan', () => {
  const lowest = (name) => Math.min(...buildOutline(name).poly.filter((p) => Math.abs(p[0]) < 1e-9 && p[1] > 0).map((p) => p[1]));
  assert.ok(lowest('front-v') < lowest('front'));
  assert.ok(lowest('front') < lowest('back'));
});

test("drawKitTextures: orqada ism va raqam, oldida homiy matni", () => {
  const { create } = fakeCanvasFactory();
  const { front, back } = drawKitTextures(design, { backName: 'rahimov', number: '10' }, { size: 1024, createCanvas: create });
  assert.equal(front.width, 1024);
  assert.ok(textsOf(back).includes('RAHIMOV'));
  assert.ok(textsOf(back).includes('10'));
  assert.ok(textsOf(back, 'strokeText').includes('10'));
  assert.ok(textsOf(front).includes('KARVON'));
  assert.ok(textsOf(front).includes('TF')); // nishon harflari
  assert.ok(!textsOf(front).includes('RAHIMOV'));
});

test("drawKitTextures: ism/raqamsiz — orqada bo'sh matn (faqat dizayn)", () => {
  const { create } = fakeCanvasFactory();
  const { back } = drawKitTextures(design, {}, { size: 512, createCanvas: create });
  assert.deepEqual(textsOf(back), ['', '']);
});

test("drawKitTextures: yuklangan nishon va homiy rasmi matn o'rniga chiziladi", () => {
  const { create } = fakeCanvasFactory();
  const img = { naturalWidth: 200, naturalHeight: 100 };
  const { front } = drawKitTextures(design, {}, { size: 512, createCanvas: create, images: { crest: img, sponsor: img } });
  assert.equal(front.calls.filter((c) => c.fn === 'drawImage').length, 2);
  assert.ok(!textsOf(front).includes('KARVON'));
  assert.ok(!textsOf(front).includes('TF'));
});

test('drawKitTextures: har bir naqsh xatosiz chiziladi', () => {
  const { create } = fakeCanvasFactory();
  for (const pattern of ['fade', 'split', 'geo', 'stripes', 'hoops', 'sash', 'halftone', 'plain']) {
    assert.doesNotThrow(() => drawKitTextures({ ...design, pattern }, { number: 7 }, { size: 256, createCanvas: create }));
  }
});

test('crestInitials', () => {
  assert.equal(crestInitials('Turon FC'), 'TF');
  assert.equal(crestInitials('zumrad'), 'ZU');
  assert.equal(crestInitials('  '), 'FC');
});
