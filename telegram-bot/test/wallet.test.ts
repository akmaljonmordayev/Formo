import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleUpdate } from '../src/handlers';
import { T } from '../src/i18n';
import { mainMenu } from '../src/wallet';
import { chooseLang, fakeDeps, photoUpdate, textUpdate, USER_ID } from './helpers';

type Reply = { keyboard: { text: string }[][] };

describe('balans (bot)', () => {
  it('menyuda balans ko‘rish bor, balans to‘ldirish yo‘q', () => {
    const menu = mainMenu('uz') as Reply;
    const labels = menu.keyboard.flat().map((button) => button.text);
    assert.ok(labels.includes(T.uz.menu.balance));
    assert.ok(labels.every((label) => !/to‘ldir|top.?up/i.test(label)));
  });

  it('/balance faqat mavjud balansni ko‘rsatadi', async () => {
    const { deps, backend, sent } = fakeDeps();
    chooseLang(deps, 'uz');
    backend.balanceResult = { linked: true, balance: 120000 };
    await handleUpdate(textUpdate('/balance'), deps);
    assert.match(sent[0].text, /120 000 so‘m/);
    assert.deepEqual(backend.calls.filter((call) => call.name === 'balance').length, 1);
    assert.equal(backend.calls.some((call) => /topup|receipt/i.test(call.name)), false);
  });

  it('/topup va eski ilova havolasi balans so‘rovi ochmaydi', async () => {
    const { deps, backend, sent } = fakeDeps();
    chooseLang(deps, 'uz');
    await handleUpdate(textUpdate('/topup'), deps);
    await handleUpdate(textUpdate('/start topup'), deps);
    assert.equal(backend.calls.some((call) => /topup|receipt/i.test(call.name)), false);
    assert.equal(sent.some((item) => /qancha summaga|summa tanlang/i.test(item.text)), false);
  });

  it('chek rasmi balansga pul qo‘shmaydi', async () => {
    const { deps, backend, sent } = fakeDeps();
    chooseLang(deps, 'uz');
    await handleUpdate(photoUpdate(['small_file_id_000', 'large_file_id_111']), deps);
    assert.equal(backend.calls.some((call) => /topup|receipt/i.test(call.name)), false);
    assert.match(sent[0].text, /tugmalardan|menyu/i);
  });
});
