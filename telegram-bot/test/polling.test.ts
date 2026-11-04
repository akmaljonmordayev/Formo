import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { POLL_STALE_MS, pollingStale, pollingState, processBatch } from '../src/polling';
import { TgUpdate } from '../src/telegram';
import { fakeDeps } from './helpers';

const msg = (updateId: number, chatId: number): TgUpdate => ({
  update_id: updateId,
  message: { message_id: updateId, chat: { id: chatId, type: 'private' }, from: { id: chatId, is_bot: false }, text: 'x' },
});

describe('processBatch', () => {
  it('sekin foydalanuvchi boshqalarni bloklamaydi, bir foydalanuvchi tartibi saqlanadi', async () => {
    const { deps } = fakeDeps();
    const done: number[] = [];
    let releaseSlow!: () => void;
    const slow = new Promise<void>((r) => (releaseSlow = r));

    const batch = processBatch(
      [msg(1, 100), msg(2, 200), msg(3, 100)],
      async (u) => {
        if (u.update_id === 1) await slow;
        done.push(u.update_id);
      },
      deps.log,
    );

    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(done, [2]); // 200-chat kutib qolmadi
    releaseSlow();
    await batch;
    assert.deepEqual(done, [2, 1, 3]); // 100-chat: 1 dan keyin 3
  });

  it('bitta update xatosi qolganlarini to‘xtatmaydi', async () => {
    const { deps } = fakeDeps();
    const done: number[] = [];
    await processBatch(
      [msg(1, 100), msg(2, 100)],
      async (u) => {
        if (u.update_id === 1) throw new Error('boom');
        done.push(u.update_id);
      },
      deps.log,
    );
    assert.deepEqual(done, [2]);
  });
});

describe('pollingStale', () => {
  it('oxirgi muvaffaqiyatli getUpdates 5 daqiqadan eski bo‘lsa — true', () => {
    const saved = pollingState.lastOkAt;
    pollingState.lastOkAt = 1_000_000;
    assert.equal(pollingStale(1_000_000 + POLL_STALE_MS - 1), false);
    assert.equal(pollingStale(1_000_000 + POLL_STALE_MS + 1), true);
    pollingState.lastOkAt = saved;
  });
});
