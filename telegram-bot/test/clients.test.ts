import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BackendClient, BackendError } from '../src/backend';
import { TelegramApi, TelegramError } from '../src/telegram';
import { INTERNAL, json, noSleep, scriptedFetch, TOKEN } from './helpers';

const refused = () => Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });

describe('TelegramApi', () => {
  it('429: retry_after kutiladi va qayta yuboriladi', async () => {
    const waits: number[] = [];
    const { impl, calls } = scriptedFetch([
      json(429, { ok: false, error_code: 429, description: 'Too Many Requests', parameters: { retry_after: 3 } }),
      json(200, { ok: true, result: { message_id: 1 } }),
    ]);
    const api = new TelegramApi(TOKEN, 'https://tg.test', impl, async (ms) => void waits.push(ms));
    await api.sendMessage(1, 'salom');
    assert.equal(calls.length, 2);
    assert.deepEqual(waits, [3000]);
  });

  it('5xx va tarmoq xatosi — qayta urinadi; 403/400 — yo‘q', async () => {
    let { impl, calls } = scriptedFetch([json(502, { ok: false }), new TypeError('fetch failed'), json(200, { ok: true, result: true })]);
    await new TelegramApi(TOKEN, 'https://tg.test', impl, noSleep).sendMessage(1, 'x');
    assert.equal(calls.length, 3);

    ({ impl, calls } = scriptedFetch([json(403, { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' })]));
    const err = await new TelegramApi(TOKEN, 'https://tg.test', impl, noSleep).sendMessage(1, 'x').catch((e) => e);
    assert.ok(err instanceof TelegramError && err.blocked);
    assert.equal(calls.length, 1);
  });

  it('xato matnida bot tokeni bo‘lmaydi', async () => {
    const { impl } = scriptedFetch([new TypeError(`fetch failed https://tg.test/bot${TOKEN}/sendMessage`)]);
    const err = await new TelegramApi(TOKEN, 'https://tg.test', impl, noSleep).sendMessage(1, 'x', {}, 0).catch((e) => e);
    assert.ok(err instanceof TelegramError);
    assert.ok(!err.message.includes(TOKEN));
  });
});

describe('BackendClient', () => {
  it('Bearer ichki token bilan va JSON tanasi bilan yuboradi', async () => {
    const { impl, calls } = scriptedFetch([json(200, { result: 'INVALID' })]);
    const client = new BackendClient('http://api.test/api', INTERNAL, impl, noSleep);
    await client.claim('t'.repeat(43), '1', '1', 'ru');
    assert.equal(calls[0].url, 'http://api.test/api/internal/telegram/claim');
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, `Bearer ${INTERNAL}`);
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { startToken: 't'.repeat(43), telegramUserId: '1', chatId: '1', language: 'ru' });
  });

  it('kod chiqaruvchi so‘rov 5xx/timeout da qayta yuborilmaydi (ikki kod chiqmasin)', async () => {
    const { impl, calls } = scriptedFetch([json(503, {})]);
    const err = await new BackendClient('http://api.test/api', INTERNAL, impl, noSleep).contact('1', '1', '+998901234567').catch((e) => e);
    assert.ok(err instanceof BackendError && err.status === 503);
    assert.equal(calls.length, 1);
  });

  it('server umuman qabul qilmagan (ECONNREFUSED) — qayta urinish xavfsiz', async () => {
    const { impl, calls } = scriptedFetch([refused(), json(200, { result: 'NO_CHALLENGE' })]);
    const res = await new BackendClient('http://api.test/api', INTERNAL, impl, noSleep).resend('1');
    assert.deepEqual(res, { result: 'NO_CHALLENGE' });
    assert.equal(calls.length, 2);
  });

  it('idempotent so‘rov 5xx da qayta urinadi, 401 da — yo‘q', async () => {
    let { impl, calls } = scriptedFetch([json(502, {}), json(200, { linked: true })]);
    await new BackendClient('http://api.test/api', INTERNAL, impl, noSleep).hello('1', '1');
    assert.equal(calls.length, 2);

    ({ impl, calls } = scriptedFetch([json(401, {})]));
    await assert.rejects(new BackendClient('http://api.test/api', INTERNAL, impl, noSleep).hello('1', '1'));
    assert.equal(calls.length, 1);
  });
});
