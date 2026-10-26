import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createBotServer, secretMatches } from '../src/server';
import { TgUpdate } from '../src/telegram';
import { fakeDeps } from './helpers';

const SECRET = 's'.repeat(40);

describe('webhook server', () => {
  const received: TgUpdate[] = [];
  const { deps } = fakeDeps();
  const server = createBotServer({
    webhook: { path: '/telegram/webhook', secret: SECRET },
    process: async (u) => void received.push(u),
    log: deps.log,
  });
  let base = '';

  before(async () => {
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => new Promise<void>((r) => server.close(() => r())));

  const post = (body: string, secret?: string) =>
    fetch(`${base}/telegram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(secret !== undefined && { 'X-Telegram-Bot-Api-Secret-Token': secret }) },
      body,
    });

  it('GET /health', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
  });

  it('sirsiz yoki noto‘g‘ri sir bilan — 401, update qayta ishlanmaydi', async () => {
    assert.equal((await post('{"update_id":1}')).status, 401);
    assert.equal((await post('{"update_id":1}', 'wrong')).status, 401);
    assert.equal((await post('{"update_id":1}', `${SECRET}x`)).status, 401);
    assert.equal(received.length, 0);
  });

  it('to‘g‘ri sir — 200 va update uzatiladi', async () => {
    const res = await post('{"update_id":42}', SECRET);
    assert.equal(res.status, 200);
    assert.equal(received.at(-1)?.update_id, 42);
  });

  it('buzuq JSON — 400; juda katta tana — 413; boshqa yo‘l — 404', async () => {
    assert.equal((await post('{', SECRET)).status, 400);
    assert.equal((await post('{"x":1}', SECRET)).status, 400);
    assert.equal((await post(`{"update_id":1,"p":"${'a'.repeat(1_100_000)}"}`, SECRET).catch(() => ({ status: 413 }))).status, 413);
    assert.equal((await fetch(`${base}/other`, { method: 'POST' })).status, 404);
  });

  it('secretMatches', () => {
    assert.equal(secretMatches(SECRET, SECRET), true);
    assert.equal(secretMatches(undefined, SECRET), false);
    assert.equal(secretMatches([SECRET], SECRET), false);
    assert.equal(secretMatches('', SECRET), false);
  });
});

describe('polling rejimi', () => {
  it('webhook yo‘li yopiq — faqat /health', async () => {
    const { deps } = fakeDeps();
    const server = createBotServer({ process: async () => {}, log: deps.log });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    assert.equal((await fetch(`${base}/telegram/webhook`, { method: 'POST', body: '{}' })).status, 404);
    assert.equal((await fetch(`${base}/health`)).status, 200);
    await new Promise<void>((r) => server.close(() => r()));
  });
});
