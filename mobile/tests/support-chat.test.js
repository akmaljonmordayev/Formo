// Yordam chati (mijoz ↔ operator): API klient shartnomasi. MOCK fetch — backend chaqirilmaydi.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = (p) => path.join(__dirname, '..', 'src', p);
const { api } = require(src('services/api.js'));
const storage = require(src('utils/storage.js'));

function mockFetch(responses) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
    const r = responses.shift();
    if (!r) throw new Error(`kutilmagan so'rov: ${url}`);
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  return calls;
}

test('support.messages: GET /support/messages, Bearer token bilan; after bo‘lsa query qo‘shiladi', async () => {
  await storage.setToken('tok-1');
  const calls = mockFetch([
    { status: 200, body: { items: [{ id: 3, text: 'Salom', fromWorkshop: true }] } },
    { status: 200, body: { items: [] } },
  ]);
  const first = await api.support.messages();
  assert.equal(first.items[0].text, 'Salom');
  assert.match(calls[0].url, /\/support\/messages$/);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].headers.Authorization, 'Bearer tok-1');

  await api.support.messages(3);
  assert.match(calls[1].url, /\/support\/messages\?after=3$/);
});

test('support.send: POST /support/messages { text }', async () => {
  await storage.setToken('tok-1');
  const calls = mockFetch([{ status: 201, body: { id: 4, text: 'Yordam kerak', fromWorkshop: true } }]);
  const msg = await api.support.send('Yordam kerak');
  assert.equal(msg.id, 4);
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(calls[0].body, { text: 'Yordam kerak' });
});

test('support.unread: GET /support/unread', async () => {
  await storage.setToken('tok-1');
  const calls = mockFetch([{ status: 200, body: { unread: 2 } }]);
  assert.deepEqual(await api.support.unread(), { unread: 2 });
  assert.match(calls[0].url, /\/support\/unread$/);
});

test('i18n: yordam chati kalitlari uchala tilda bor', () => {
  const src2 = require('fs').readFileSync(src('i18n/index.js'), 'utf8');
  for (const key of ['supportChat', 'supportChatSub', 'supportOperator', 'supportEmpty', 'supportPlaceholder', 'supportSend']) {
    const count = (src2.match(new RegExp(`\\b${key}:`, 'g')) || []).length;
    assert.equal(count, 3, `${key} 3 tilda bo'lishi kerak`);
  }
});
