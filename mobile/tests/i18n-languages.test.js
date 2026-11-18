// Ilova tillari: o'zbekcha (lotin), yangi lotin alifbosi, o'zbek kirill, ruscha, inglizcha
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { languageOptions } = require(src('i18n/index.js'));
const { toUzNewLatin } = require(src('i18n/uzNewLatin.js'));
const { toUzCyrillic } = require(src('i18n/uzCyrillic.js'));
const { legalTexts } = require(src('content/legal/index.js'));

test("tillar ro'yxati: o'zbekcha, yangi alifbo, kirill, ruscha, inglizcha", () => {
  assert.deepEqual(languageOptions.map((o) => o.code), ['uz', 'uzn', 'uzc', 'ru', 'en']);
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

test('kirill: Oʻ→Ў, Gʻ→Ғ, Sh→Ш, Ch→Ч, Yo/Yu/Ya, boshdagi E→Э, tutuq→ъ; brendlar va {placeholder} o‘zgarmaydi', () => {
  assert.equal(toUzCyrillic('Buyurtmangiz qabul qilindi'), 'Буюртмангиз қабул қилинди');
  assert.equal(toUzCyrillic('Yo‘q'), 'Йўқ');
  assert.equal(toUzCyrillic('O‘zbekcha, ruscha yoki inglizcha'), 'Ўзбекча, русча ёки инглизча');
  assert.equal(toUzCyrillic('Profil ma’lumotlarim'), 'Профил маълумотларим');
  assert.equal(toUzCyrillic('Eslatma: yetkazib berish'), 'Эслатма: етказиб бериш');
  assert.equal(toUzCyrillic('Qorong‘i'), 'Қоронғи');
  assert.equal(toUzCyrillic('ISM VA RAQAM'), 'ИСМ ВА РАҚАМ');
  assert.equal(toUzCyrillic('Telegram · Formo · {n}-bosqich'), 'Telegram · Formo · {n}-босқич');
});

test('kirill oferta matni o‘zbekchadan avtomatik', () => {
  const texts = legalTexts('uzc');
  assert.match(texts.offer.title, /^[А-ЯЁЎҚҒҲа-яёўқғҳ ]+$/);
});
