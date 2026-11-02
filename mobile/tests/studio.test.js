const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { designText } = require(src('features/studio/index.js'));

const t = (k) => k;
const base = { color: { type: 'solid', id: 'qora' }, font: 'sport', patch: null, package: 'oddiy-paket' };

test("eski maxsus dizayn qatori: rang, shrift, yozuv rangi, neon, sovg'a qutisi tavsifga tushadi", () => {
  assert.equal(designText(t, base), 'color_qora · font_sport');
  assert.match(designText(t, { ...base, textColor: 'oltin', textEffect: 'neon' }), /textColorShort — tcolor_oltin · neonEffect/);
  assert.equal(designText(t, { color: { type: 'gradient', id: 'tun' }, package: 'sovga-qutisi' }), 'grad_tun · pkg_sovga-qutisi');
  assert.equal(designText(t, { color: { type: 'custom', hex: '#7a4fd1' } }), '#7A4FD1');
  assert.equal(designText(t, null), '');
});
