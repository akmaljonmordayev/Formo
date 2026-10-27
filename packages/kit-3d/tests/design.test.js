import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_KIT_DESIGN, KIT_PATTERNS, KIT_PRESETS, normalizeDesign, normalizePrint } from '../src/design.js';

test('normalizeDesign: bo\'sh qiymat standart dizaynga aylanadi', () => {
  assert.deepEqual(normalizeDesign(null), { ...DEFAULT_KIT_DESIGN });
  assert.deepEqual(normalizeDesign(undefined), { ...DEFAULT_KIT_DESIGN });
});

test("normalizeDesign: noto'g'ri rang, naqsh va yoqa standartga qaytadi", () => {
  const d = normalizeDesign({ primaryColor: 'red', secondaryColor: '#12', textColor: '#ABCDEF', pattern: 'zigzag', neck: 'polo' });
  assert.equal(d.primaryColor, DEFAULT_KIT_DESIGN.primaryColor);
  assert.equal(d.secondaryColor, DEFAULT_KIT_DESIGN.secondaryColor);
  assert.equal(d.textColor, '#abcdef');
  assert.equal(d.pattern, 'fade');
  assert.equal(d.neck, 'round');
});

test("normalizeDesign: bo'sh URL null bo'ladi, homiy matni qisqartiriladi", () => {
  const d = normalizeDesign({ crestImageUrl: '  ', sponsorImageUrl: ' https://cdn/x.png ', sponsorText: 'A'.repeat(40) });
  assert.equal(d.crestImageUrl, null);
  assert.equal(d.sponsorImageUrl, 'https://cdn/x.png');
  assert.equal(d.sponsorText.length, 20);
});

test('KIT_PRESETS: hammasi yaroqli dizayn', () => {
  for (const p of KIT_PRESETS) {
    const d = normalizeDesign(p);
    assert.equal(d.primaryColor, p.primaryColor);
    assert.ok(KIT_PATTERNS.includes(d.pattern));
  }
});

test('normalizePrint: ism katta harf, 12 belgigacha; raqam 0–99', () => {
  assert.deepEqual(normalizePrint({ backName: '  rahimov ', number: '10' }), { backName: 'RAHIMOV', number: '10' });
  assert.deepEqual(normalizePrint({ backName: 'алиев', number: 7 }), { backName: 'АЛИЕВ', number: '7' });
  assert.equal(normalizePrint({ backName: 'abcdefghijklmnop' }).backName, 'ABCDEFGHIJKL');
  assert.equal(normalizePrint({ number: '07' }).number, '7');
  assert.equal(normalizePrint({ number: '0' }).number, '0');
  assert.equal(normalizePrint({ number: 'x9y9z' }).number, '99');
  assert.equal(normalizePrint({ number: '' }).number, '');
  assert.deepEqual(normalizePrint(), { backName: '', number: '' });
});
