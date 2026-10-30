import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleUpdate } from '../src/handlers';
import { RESEND_DATA } from '../src/messages';
import { callbackUpdate, chooseLang, contactUpdate, fakeDeps, textUpdate, USER_ID } from './helpers';

const START_TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';

describe('handleUpdate', () => {
  it('/start <token>: so‘rovni egallaydi va kontakt tugmasini ko‘rsatadi', async () => {
    const { deps, backend, sent } = fakeDeps();
    chooseLang(deps, 'uz');
    await handleUpdate(textUpdate(`/start ${START_TOKEN}`), deps);

    assert.deepEqual(backend.calls[0], { name: 'claim', args: [START_TOKEN, String(USER_ID), String(USER_ID), 'uz'] });
    assert.match(sent[0].text, /\+998 90 \*\*\* \*\* 67/);
    const markup = sent[0].options?.reply_markup as { keyboard: { request_contact?: boolean }[][] };
    assert.equal(markup.keyboard[0][0].request_contact, true);
  });

  it('/start: yaroqsiz yoki eskirgan token', async () => {
    const { deps, backend, sent } = fakeDeps();
    chooseLang(deps, 'uz');
    backend.claimResult = { result: 'INVALID' };
    await handleUpdate(textUpdate(`/start ${START_TOKEN}`), deps);
    assert.match(sent[0].text, /eskirgan/);

    // shakli noto'g'ri payload backend'ga umuman yuborilmaydi
    await handleUpdate(textUpdate('/start <script>'), deps);
    assert.equal(backend.calls.length, 1);
    assert.match(sent[1].text, /eskirgan/);
  });

  it('/start payloadsiz: ulangan bo‘lsa xabarlarni qayta yoqadi', async () => {
    const { deps, backend, sent } = fakeDeps();
    backend.linked = true;
    backend.language = 'uz'; // akkauntda saqlangan til — qayta so'ralmaydi
    await handleUpdate(textUpdate('/start'), deps);
    assert.equal(backend.calls[0].name, 'hello');
    assert.equal(backend.calls.length, 1);
    assert.match(sent[0].text, /ulangan/);
  });

  it('o‘z kontakti: kod HTML <code> ichida va "Yangi kod" tugmasi bilan', async () => {
    const { deps, backend, sent } = fakeDeps();
    chooseLang(deps, 'uz');
    await handleUpdate(contactUpdate('998901234567', USER_ID), deps);

    assert.deepEqual(backend.calls[0], { name: 'contact', args: [String(USER_ID), String(USER_ID), '998901234567'] });
    assert.match(sent[0].text, /<code>48213<\/code>/);
    assert.match(sent[0].text, /hech kimga bermang/);
    assert.equal(sent[0].options?.parse_mode, 'HTML');
    const markup = sent[0].options?.reply_markup as { inline_keyboard: { callback_data: string }[][] };
    assert.equal(markup.inline_keyboard[0][0].callback_data, RESEND_DATA);
  });

  it('boshqa odamning kontakti yoki user_id siz kontakt — backend chaqirilmaydi', async () => {
    const { deps, backend, sent } = fakeDeps();
    await handleUpdate(contactUpdate('+998901234567', 999), deps);
    await handleUpdate(contactUpdate('+998901234567', undefined), deps);
    assert.equal(backend.calls.length, 0);
    assert.equal(sent.length, 2);
    assert.match(sent[0].text, /o‘zingizning raqamingizni/);
  });

  it('raqam mos kelmasa, cooldown, limit — tushunarli xabar', async () => {
    const { deps, backend, sent } = fakeDeps();
    backend.codeResult = { result: 'PHONE_MISMATCH' };
    await handleUpdate(contactUpdate('+998907777777', USER_ID), deps);
    backend.codeResult = { result: 'COOLDOWN', retryAfterSec: 17 };
    await handleUpdate(callbackUpdate(RESEND_DATA), deps);
    backend.codeResult = { result: 'LIMIT' };
    await handleUpdate(callbackUpdate(RESEND_DATA), deps);

    assert.match(sent[0].text, /mos kelmadi/);
    assert.match(sent[1].text, /17 soniyadan/);
    assert.match(sent[2].text, /limiti tugadi/);
  });

  it('"Yangi kod" tugmasi: callback javoblanadi va resend chaqiriladi', async () => {
    const { deps, backend, sent, answered } = fakeDeps();
    chooseLang(deps, 'uz');
    await handleUpdate(callbackUpdate(RESEND_DATA), deps);
    assert.equal(answered.length, 1);
    assert.deepEqual(backend.calls[0], { name: 'resend', args: [String(USER_ID)] });
    assert.match(sent[0].text, /<code>48213<\/code>/);
  });

  it('guruh chatida hech narsa qilinmaydi', async () => {
    const { deps, backend, sent } = fakeDeps();
    await handleUpdate(textUpdate(`/start ${START_TOKEN}`, { chatType: 'group' }), deps);
    assert.equal(backend.calls.length, 0);
    assert.equal(sent.length, 0);
  });

  it('takroriy update (bir xil update_id) ikkinchi marta qayta ishlanmaydi', async () => {
    const { deps, backend } = fakeDeps();
    chooseLang(deps, 'uz');
    const update = contactUpdate('+998901234567', USER_ID);
    await handleUpdate(update, deps);
    await handleUpdate(update, deps);
    assert.equal(backend.calls.length, 1);
  });

  it('backend ishlamasa — foydalanuvchiga umumiy xabar, logda kod/raqam yo‘q', async () => {
    const { deps, backend, sent, lines } = fakeDeps();
    backend.fail = true;
    await handleUpdate(contactUpdate('+998901234567', USER_ID), deps);
    assert.match(sent[0].text, /Texnik nosozlik/);
    assert.ok(lines.every((l) => !l.includes('998901234567')));
  });

  it('/stop: xabarlarni o‘chiradi', async () => {
    const { deps, backend, sent } = fakeDeps();
    backend.linked = true;
    chooseLang(deps, 'uz');
    await handleUpdate(textUpdate('/stop'), deps);
    assert.equal(backend.calls[0].name, 'stop');
    assert.match(sent[0].text, /o‘chirildi/);
  });

  it('boshqa matn — yordam', async () => {
    const { deps, sent } = fakeDeps();
    await handleUpdate(textUpdate('salom'), deps);
    assert.match(sent[0].text, /Buyruqlar/);
  });
});
