const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createJerseyScene,
  DEPTH,
  fontOptions,
  hasGlyphs,
  normalizeOptions,
  radiusAt,
  textGeometry,
  wrapOnTorso,
} = require('../src/components/ui/jersey3d/model');

const meshes = (obj) => {
  const out = [];
  obj.traverse((o) => o.isMesh && out.push(o));
  return out;
};

describe('3D forma modeli (three.js, GL kerak emas)', () => {
  it('shrift: lotin bosh harflar, raqamlar, o‘zbekcha apostrof; kirill — 2D zaxira', () => {
    assert.equal(hasGlyphs("O'TKIR 10"), true);
    assert.equal(hasGlyphs('G‘OYIB'), true);
    assert.equal(hasGlyphs('ŞÜKRÜ'), true);
    assert.equal(hasGlyphs('ИВАН'), false);
  });

  it('matn tana sirtiga o‘raladi: har bir nuqta ellips sirtida, orqa tomonda z < 0', () => {
    const geo = wrapOnTorso(textGeometry('10', { cap: 0.6 }), { side: 'back', y: -0.08, lift: 0 });
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 7) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const a = radiusAt(y);
      // (x/a)^2 + (z/(a*DEPTH))^2 = 1
      assert.ok(Math.abs((x / a) ** 2 + (z / (a * DEPTH)) ** 2 - 1) < 1e-6);
      assert.ok(z < 0);
    }
  });

  it('uzun ism belgilangan kenglikdan oshmaydi', () => {
    const geo = textGeometry('XXXXXXXXXXXX', { cap: 0.13, maxWidth: 0.95 });
    geo.computeBoundingBox();
    assert.ok(geo.boundingBox.max.x - geo.boundingBox.min.x <= 0.951);
  });

  it('studiya shriftlari: sport — kursiv, oddiy — kichik oraliq', () => {
    assert.equal(fontOptions({ fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 }).italic, true);
    assert.equal(fontOptions({ fontWeight: '600', letterSpacing: 0 }).italic, false);
    assert.equal(normalizeOptions({ name: ' abdulla ', kit: {} }).name, 'ABDULLA');
  });

  it('sahna: rang darhol yangilanadi, matn faqat o‘zgarganda qayta quriladi, dispose xatosiz', () => {
    const view = createJerseyScene({ kit: { color: '#2A3FB0', ink: '#F3F5F9', crest: 'NSF', patches: ['star'] }, name: 'ALI', number: '7' });
    const before = meshes(view.root).length;
    const body = meshes(view.root)[0];
    view.update({ kit: { color: '#D63A45', ink: '#F3F5F9', crest: 'NSF', patches: ['star'] }, name: 'ALI', number: '7' });
    assert.equal(body.material.color.getHexString(), new body.material.color.constructor('#D63A45').getHexString());
    assert.equal(meshes(view.root).length, before);

    view.update({ kit: { color: '#D63A45', ink: '#F3F5F9' }, name: '', number: '' });
    assert.ok(meshes(view.root).length < before);

    let triangles = 0;
    view.scene.traverse((o) => {
      if (o.isMesh) triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    });
    // Telefon uchun yengil model
    assert.ok(triangles < 40000, `triangles: ${triangles}`);
    view.setAspect(0.6);
    assert.ok(view.camera.position.z > 6.2);
    view.dispose();
  });
});
