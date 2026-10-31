// Oferta/maxfiylik matnlari: uch tilda bir xil tuzilma va Superadmin qoidalaridagi raqamlar
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { legalTexts } = require(path.join(__dirname, '..', 'src', 'content', 'legal', 'index.js'));

test('oferta: uz/ru/en bir xil bo‘limlar soni, qoidalardagi raqamlar matnda', () => {
  const rules = { returnDays: 7, productionDaysMin: 3, productionDaysMax: 6, allowCash: false };
  const docs = ['uz', 'ru', 'en'].map((lang) => legalTexts(lang, rules));
  for (const doc of docs) {
    assert.equal(doc.offer.sections.length, docs[0].offer.sections.length);
    assert.equal(doc.privacy.sections.length, docs[0].privacy.sections.length);
    const text = JSON.stringify(doc.offer);
    assert.match(text, /3–6/);
    assert.match(text, /\b7\b/);
  }
  // Naqd o'chirilgan — to'lov bandida naqd tilga olinmaydi
  assert.doesNotMatch(docs[0].offer.sections[3].items[1], /naqd/);
  // Noma'lum til — o'zbekcha
  assert.equal(legalTexts('xx').offer.title, docs[0].offer.title);
});
