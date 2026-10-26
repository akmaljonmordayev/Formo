import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { handleUpdate, resetLimitsCache } from '../src/handlers';
import { T } from '../src/i18n';
import { parseAmount } from '../src/wallet';
import { callbackUpdate, chooseLang, fakeDeps, photoUpdate, textUpdate, USER_ID } from './helpers';

type Inline = { inline_keyboard: { text: string; callback_data: string }[][] };
const LIMITS = { min: 10000, max: 10000000 };

describe('balans va to‘ldirish (bot)', () => {
  beforeEach(() => resetLimitsCache());

  it('summa tahlili: bo‘shliq/vergul/valyuta, chegaralar', () => {
    assert.equal(parseAmount('75 000', LIMITS), 75000);
    assert.equal(parseAmount('75,000 so‘m', LIMITS), 75000);
    assert.equal(parseAmount('100000 сум', LIMITS), 100000);
    assert.equal(parseAmount('9999', LIMITS), null);
    assert.equal(parseAmount('10000001', LIMITS), null);
    assert.equal(parseAmount('50000.5', LIMITS), null);
    assert.equal(parseAmount('-50000', LIMITS), null);
    assert.equal(parseAmount('abc', LIMITS), null);
  });

  it('menyu "To‘ldirish": 30/50/100 ming va "Boshqa summa" tugmalari', async () => {
    const { deps, sent } = fakeDeps();
    await handleUpdate(textUpdate(T.uz.menu.topup), deps);
    const kb = sent[0].options?.reply_markup as Inline;
    assert.deepEqual(kb.inline_keyboard[0].map((b) => b.callback_data), ['tu:30000', 'tu:50000', 'tu:100000']);
    assert.equal(kb.inline_keyboard[1][0].callback_data, 'tu:other');
  });

  it('tayyor summa → tasdiq → karta rekvizitlari va so‘rov kodi (pul qo‘shilmaydi)', async () => {
    const { deps, backend, sent } = fakeDeps();
    await handleUpdate(callbackUpdate('tu:50000'), deps);
    assert.match(sent[0].text, /50 000 so‘m/);
    const confirm = (sent[0].options?.reply_markup as Inline).inline_keyboard[0][0];
    assert.equal(confirm.callback_data, 'tc:50000');

    await handleUpdate(callbackUpdate('tc:50000'), deps);
    assert.deepEqual(backend.calls.find((c) => c.name === 'createTopUp')?.args, [String(USER_ID), 50000]);
    assert.match(sent[1].text, /9860 0112 0207 4545/);
    assert.match(sent[1].text, /Abdulla Yakubov/);
    assert.match(sent[1].text, /TOP-000007/);
    assert.match(sent[1].text, /admin chekni tekshirib tasdiqlagandan keyingina/);
    assert.equal((sent[1].options?.reply_markup as Inline).inline_keyboard[0][0].callback_data, 'tk:7');
  });

  it('boshqa summa: noto‘g‘ri summa rad etiladi, to‘g‘risi tasdiqqa o‘tadi', async () => {
    const { deps, backend, sent } = fakeDeps();
    await handleUpdate(callbackUpdate('tu:other'), deps);
    await handleUpdate(textUpdate('500'), deps);
    assert.match(sent[1].text, /noto‘g‘ri/);
    await handleUpdate(textUpdate('75 000'), deps);
    assert.equal((sent[2].options?.reply_markup as Inline).inline_keyboard[0][0].callback_data, 'tc:75000');
    // so'rov faqat tasdiqdan keyin ochiladi
    assert.equal(backend.calls.filter((c) => c.name === 'createTopUp').length, 0);
    // kutish holati tugagan — oddiy matn yordamga ketadi
    await handleUpdate(textUpdate('80000'), deps);
    assert.match(sent[3].text, /Buyruqlar/);
  });

  it('callback summasi chegaradan tashqarida — so‘rov ochilmaydi', async () => {
    const { deps, backend, sent } = fakeDeps();
    await handleUpdate(callbackUpdate('tu:5'), deps);
    assert.match(sent[0].text, /noto‘g‘ri/);
    assert.equal(backend.calls.filter((c) => c.name === 'createTopUp').length, 0);
  });

  it('chek rasmi: eng katta rasm yuboriladi, faqat ochiq so‘rovga', async () => {
    const { deps, backend, sent } = fakeDeps();
    chooseLang(deps, 'uz');
    await handleUpdate(photoUpdate(['small_file_id_000', 'large_file_id_111']), deps);
    assert.deepEqual(backend.calls[0], { name: 'attachReceipt', args: [String(USER_ID), 'large_file_id_111', 'u_large_file_id_111'] });
    assert.match(sent[0].text, /Ochiq to‘ldirish so‘rovi yo‘q/);

    backend.receiptResult = {
      result: 'OK',
      topUp: { id: 7, code: 'TOP-000007', amount: 50000, method: 'MANUAL_CARD', status: 'REVIEW', hasReceipt: true, rejectReason: null, createdAt: '' },
    };
    await handleUpdate(photoUpdate(['large_file_id_222']), deps);
    assert.match(sent[1].text, /Chek qabul qilindi: TOP-000007/);
    assert.match(sent[1].text, /Tasdiqlangach/);

    backend.receiptResult = { result: 'DUPLICATE_RECEIPT' };
    await handleUpdate(photoUpdate(['large_file_id_333']), deps);
    assert.match(sent[2].text, /avval boshqa so‘rov/);
  });

  it('ilovadan /start topup — summa tanlash ochiladi', async () => {
    const { deps, sent } = fakeDeps();
    chooseLang(deps, 'uz');
    await handleUpdate(textUpdate('/start topup'), deps);
    assert.equal((sent[0].options?.reply_markup as Inline).inline_keyboard[0][0].callback_data, 'tu:30000');
  });

  it('to‘lov ma’lumotlari: Humo karta, qabul qiluvchi, chek so‘raladi', async () => {
    const text = T.uz.payment(50000, { cardNumber: '9860 0112 0207 4545', cardHolder: 'YAKUBOV ABDULLA', bankName: 'Humo', comment: 'TOP-000001' });
    assert.match(text, /Humo karta: <code>9860 0112 0207 4545<\/code>/);
    assert.match(text, /YAKUBOV ABDULLA/);
    assert.match(text, /chekini/);
  });

  it('ulanmagan akkaunt: balans ko‘rsatilmaydi', async () => {
    const { deps, backend, sent } = fakeDeps();
    backend.meResult = { linked: false };
    await handleUpdate(textUpdate('/balance'), deps);
    assert.match(sent[0].text, /ulanmagan/);
    assert.equal(backend.calls.some((c) => c.name === 'balance'), false);
  });

  it('balans: holatlar tilda; til tanlanadi va backend’ga saqlanadi', async () => {
    const { deps, backend, sent } = fakeDeps();
    backend.balanceResult = {
      linked: true,
      balance: 120000,
      topUps: [{ id: 3, code: 'TOP-000003', amount: 120000, method: 'MANUAL_CARD', status: 'APPROVED', hasReceipt: true, rejectReason: null, createdAt: '' }],
    };
    await handleUpdate(callbackUpdate('lang:ru'), deps);
    assert.deepEqual(backend.calls[0], { name: 'setLanguage', args: [String(USER_ID), 'ru'] });
    assert.match(sent[0].text, /Русский/);

    await handleUpdate(textUpdate(T.ru.menu.balance), deps);
    assert.match(sent[1].text, /Ваш баланс: <b>120 000 сум<\/b>/);
    assert.match(sent[1].text, /подтверждено/);
  });

  it('Telegram tili ingliz bo‘lsa — inglizcha menyu matnlari', async () => {
    const { deps, sent } = fakeDeps();
    await handleUpdate(textUpdate('/topup', { lang: 'en' }), deps);
    assert.match(sent[0].text, /How much/);
  });
});
