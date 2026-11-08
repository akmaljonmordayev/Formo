// Ilova tillari: o'zbekcha (lotin), yangi lotin alifbosi, ruscha, inglizcha
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { languageOptions } = require(src('i18n/index.js'));
const { toUzNewLatin } = require(src('i18n/uzNewLatin.js'));

test("tillar ro'yxati: o'zbekcha, yangi alifbo, ruscha, inglizcha", () => {
  assert.deepEqual(languageOptions.map((o) => o.code), ['uz', 'uzn', 'ru', 'en']);
  for (const o of languageOptions) assert.ok(o.label, o.code);
});

test("yangi alifbo: Oʻ→Ō, Gʻ→Ḡ, Sh→Ş, Ch→Ç, tutuq belgisi ʼ; brendlar o'zgarmaydi", () => {
  assert.equal(toUzNewLatin('Oʻzbekiston'), 'Ōzbekiston');
  assert.equal(toUzNewLatin("Sevimli o'yinchi"), 'Sevimli ōyinçi');
  assert.equal(toUzNewLatin('Shortikka raqam'), 'Şortikka raqam');
  assert.equal(toUzNewLatin('Sog‘liq'), 'Soḡliq');
  assert.equal(toUzNewLatin("Ma'lumot"), 'Maʼlumot');
  assert.equal(toUzNewLatin('Telegram · Formo · {n}'), 'Telegram · Formo · {n}');
});
