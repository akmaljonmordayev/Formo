import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../src/config';
import { RecentIds } from '../src/dedupe';
import { createLogger } from '../src/log';
import { classify, drainOutbox } from '../src/outbox';
import { TelegramError } from '../src/telegram';
import { fakeDeps, INTERNAL, TOKEN } from './helpers';

describe('outbox', () => {
  it('xatolarni tasniflaydi', () => {
    assert.equal(classify(new TelegramError('sendMessage', 403, 'blocked')), 'BLOCKED');
    assert.equal(classify(new TelegramError('sendMessage', 400, 'chat not found')), 'FAILED');
    assert.equal(classify(new TelegramError('sendMessage', 429, 'flood')), 'RETRY');
    assert.equal(classify(new TelegramError('sendMessage', 0, 'network')), 'RETRY');
    assert.equal(classify(new Error('x')), 'RETRY');
  });

  it('yuboradi va har xabar natijasini backend’ga qaytaradi', async () => {
    const { deps, backend } = fakeDeps();
    backend.outbox = [
      { id: 1, chatId: '10', text: 'a', attempts: 1 },
      { id: 2, chatId: '20', text: 'b', attempts: 1 },
    ];
    const sent: string[] = [];
    const tg = {
      sendMessage: async (chatId: string) => {
        if (chatId === '20') throw new TelegramError('sendMessage', 403, 'Forbidden: bot was blocked by the user');
        sent.push(chatId);
      },
    };
    assert.equal(await drainOutbox(backend, tg, deps.log), 2);
    assert.deepEqual(sent, ['10']);
    assert.deepEqual(backend.reports.map((r) => [r.id, r.result]), [[1, 'SENT'], [2, 'BLOCKED']]);
  });
});

describe('config', () => {
  const base = { TELEGRAM_BOT_TOKEN: TOKEN, BACKEND_URL: 'http://localhost:3001/api/', TELEGRAM_INTERNAL_TOKEN: INTERNAL };

  it('polling uchun minimal sozlama', () => {
    const c = loadConfig(base);
    assert.equal(c.mode, 'polling');
    assert.equal(c.backendUrl, 'http://localhost:3001/api');
    assert.equal(c.telegramApiBase, 'https://api.telegram.org');
  });

  it('xato xabarida qiymatlar emas, faqat nomlar', () => {
    assert.throws(
      () => loadConfig({ ...base, TELEGRAM_INTERNAL_TOKEN: 'short-secret-value' }),
      (err: Error) => /TELEGRAM_INTERNAL_TOKEN/.test(err.message) && !err.message.includes('short-secret-value'),
    );
    assert.throws(() => loadConfig({ ...base, TELEGRAM_BOT_TOKEN: 'nope' }), /TELEGRAM_BOT_TOKEN/);
  });

  it('webhook: https URL va kuchli sir majburiy', () => {
    assert.throws(() => loadConfig({ ...base, BOT_MODE: 'webhook', TELEGRAM_WEBHOOK_URL: 'http://x.uz', TELEGRAM_WEBHOOK_SECRET: 'abc' }), /https.*\n.*SECRET/s);
    const c = loadConfig({ ...base, BOT_MODE: 'webhook', TELEGRAM_WEBHOOK_URL: 'https://bot.formo.uz/telegram/webhook', TELEGRAM_WEBHOOK_SECRET: 'w'.repeat(40) });
    assert.equal(c.mode, 'webhook');
  });
});

describe('log', () => {
  it('sir qiymatlar logda yashiriladi', () => {
    const lines: string[] = [];
    const log = createLogger([TOKEN, INTERNAL], (l) => lines.push(l));
    log.error('xato', { error: `https://api.telegram.org/bot${TOKEN}/x ${INTERNAL}` });
    assert.ok(!lines[0].includes(TOKEN) && !lines[0].includes(INTERNAL));
    assert.match(lines[0], /<redacted>/);
  });
});

describe('RecentIds', () => {
  it('chegaralangan: eski id’lar unutiladi', () => {
    const ids = new RecentIds(2);
    assert.equal(ids.add(1), true);
    assert.equal(ids.add(1), false);
    ids.add(2);
    ids.add(3);
    assert.equal(ids.add(1), true);
  });
});
