import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleUpdate } from '../src/handlers';
import { FIRST_LANGUAGE_PROMPT, T } from '../src/i18n';
import { callbackUpdate, contactUpdate, fakeDeps, textUpdate, USER_ID } from './helpers';

const START_TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';
type Inline = { inline_keyboard: { text: string; callback_data: string }[][] };
type Reply = { keyboard: { text: string }[][] };

describe('til: birinchi /start va barcha xabarlar bir tilda', () => {
  it('birinchi /start: Telegram tilidan qat’i nazar avval til so‘raladi', async () => {
    const { deps, sent } = fakeDeps();
    await handleUpdate(textUpdate('/start', { lang: 'ru' }), deps);
    assert.equal(sent[0].text, FIRST_LANGUAGE_PROMPT);
    const buttons = (sent[0].options?.reply_markup as Inline).inline_keyboard[0].map((b) => b.callback_data);
    assert.deepEqual(buttons, ['lang:uz', 'lang:ru', 'lang:en']);
  });

  it('til tanlangach to‘xtatilgan /start shu tilda davom etadi', async () => {
    const { deps, backend, sent } = fakeDeps();
    backend.linked = true;
    backend.meResult = { linked: true, firstName: 'Aziz', balance: 0, activeOrders: 0, language: null };
    await handleUpdate(textUpdate('/start', { lang: 'ru' }), deps);
    await handleUpdate(callbackUpdate('lang:uz'), deps);

    assert.deepEqual(backend.calls.at(-1), { name: 'setLanguage', args: [String(USER_ID), 'uz'] });
    assert.equal(sent[1].text, T.uz.welcomeLinked);
    assert.equal((sent[1].options?.reply_markup as Reply).keyboard[0][0].text, T.uz.menu.balance);

    // keyingi /start endi til so'ramaydi
    await handleUpdate(textUpdate('/start', { lang: 'ru' }), deps);
    assert.equal(sent[2].text, T.uz.welcomeLinked);
  });

  it('kirish havolasi: tanlangan til backend’ga yuboriladi, kod ham shu tilda', async () => {
    const { deps, backend, sent } = fakeDeps();
    await handleUpdate(textUpdate(`/start ${START_TOKEN}`, { lang: 'uz' }), deps);
    assert.equal(sent[0].text, FIRST_LANGUAGE_PROMPT);
    assert.equal(backend.calls.some((c) => c.name === 'claim'), false);

    await handleUpdate(callbackUpdate('lang:ru'), deps);
    assert.deepEqual(backend.calls.find((c) => c.name === 'claim'), {
      name: 'claim',
      args: [START_TOKEN, String(USER_ID), String(USER_ID), 'ru'],
    });
    assert.match(sent[1].text, /Запрос на вход/);
    assert.equal((sent[1].options?.reply_markup as Reply).keyboard[0][0].text, '📱 Отправить номер');

    await handleUpdate(contactUpdate('+998901234567', USER_ID), deps);
    assert.match(sent[2].text, /Код для входа в приложение Formo: <code>48213<\/code>/);
    assert.equal((sent[2].options?.reply_markup as Inline).inline_keyboard[0][0].text, '🔁 Новый код');
  });

  it('qayta ishga tushgandan keyin: til akkauntdan tiklanadi (Telegram tili emas)', async () => {
    const { deps, backend, sent } = fakeDeps();
    backend.meResult = { linked: true, firstName: 'Aziz', balance: 0, activeOrders: 0, language: 'uz' };
    await handleUpdate(textUpdate('/topup', { lang: 'ru' }), deps);
    assert.match(sent[0].text, /Qancha summaga/);

    // backend'dan faqat bir marta so'raladi
    await handleUpdate(textUpdate('salom', { lang: 'ru' }), deps);
    assert.equal(sent[1].text, T.uz.help);
    assert.equal(backend.calls.filter((c) => c.name === 'me').length, 2); // langOf + startTopUp
  });
});
