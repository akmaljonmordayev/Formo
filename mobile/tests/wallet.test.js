const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Linking } = require('react-native');
const { canPayFromBalance, openTopUpBot, topUpLinks, TOPUP_STATUS, TX_META } = require('../src/features/wallet');
const { CHECKOUT_METHODS } = require('../src/features/orders');
const { isBotUsername } = require('../src/features/config');

describe('balans: to‘ldirish faqat Telegram bot orqali', () => {
  beforeEach(() => {
    Linking.opened.length = 0;
    global.__stubs.telegramInstalled = false;
  });

  it('bot havolasi — start=topup; noto‘g‘ri username bilan havola yasalmaydi', () => {
    assert.deepEqual(topUpLinks('formo_uz_bot'), {
      app: 'tg://resolve?domain=formo_uz_bot&start=topup',
      web: 'https://t.me/formo_uz_bot?start=topup',
    });
    assert.equal(topUpLinks(null), null);
    assert.equal(topUpLinks('bad name'), null);
    assert.equal(topUpLinks('x'), null);
    assert.equal(isBotUsername('formo_bot'), true);
    assert.equal(isBotUsername('https://evil.example'), false);
  });

  it('Telegram o‘rnatilgan bo‘lsa ilova, aks holda t.me ochiladi; bot yo‘q — false', async () => {
    global.__stubs.telegramInstalled = true;
    assert.equal(await openTopUpBot('formo_uz_bot'), true);
    assert.deepEqual(Linking.opened, ['tg://resolve?domain=formo_uz_bot&start=topup']);

    global.__stubs.telegramInstalled = false;
    assert.equal(await openTopUpBot('formo_uz_bot'), true);
    assert.equal(Linking.opened[1], 'https://t.me/formo_uz_bot?start=topup');

    assert.equal(await openTopUpBot(''), false);
    assert.equal(Linking.opened.length, 2);
  });

  it('checkout: balans (asosiy) va naqd — Click/Payme mijozga ko‘rsatilmaydi', () => {
    assert.deepEqual(CHECKOUT_METHODS, ['BALANCE', 'CASH']);
    assert.ok(!CHECKOUT_METHODS.includes('CLICK') && !CHECKOUT_METHODS.includes('PAYME'));
  });

  it('balans yetarliligi (faqat UI ogohlantirishi — server baribir tekshiradi)', () => {
    assert.equal(canPayFromBalance(100000, 100000), true);
    assert.equal(canPayFromBalance(99999, 100000), false);
    assert.equal(canPayFromBalance(null, 1), false);
    assert.equal(canPayFromBalance(NaN, 0), false);
  });

  it('backend holatlari va harakat turlari uchun matn bor', () => {
    assert.deepEqual(Object.keys(TOPUP_STATUS).sort(), ['APPROVED', 'CANCELLED', 'PENDING', 'REJECTED', 'REVIEW']);
    assert.deepEqual(Object.keys(TX_META).sort(), ['ORDER_PAYMENT', 'ORDER_REFUND', 'TOPUP', 'TOPUP_REVERSAL']);
  });
});

describe('buyurtma: mijoz ko‘radigan holat va bekor qilish', () => {
  const { canCancelOrder, toCustomerOrder } = require('../src/features/orders');

  it('faqat admin qabul qilguncha bekor qilinadi; server ruxsat bermasa — hech qachon', () => {
    assert.equal(canCancelOrder({ status: 'PENDING_PAYMENT', canCancel: true }), true);
    assert.equal(canCancelOrder({ status: 'NEW', canCancel: true }), true);
    // "Qabul qilindi" — server hali ruxsat bersa ham ilovada bekor qilinmaydi
    assert.equal(canCancelOrder({ status: 'SENT_TO_WORKSHOP', canCancel: true }), false);
    assert.equal(canCancelOrder({ status: 'ACCEPTED', canCancel: false }), false);
    // bekor qilish muddati o'tgan
    assert.equal(canCancelOrder({ status: 'NEW', canCancel: false }), false);
    assert.equal(canCancelOrder(null), false);
  });

  it('admin "Qaytarildi" deb belgilagan buyurtma mijozga "Bekor qilindi" bo‘lib ko‘rinadi', () => {
    const shown = toCustomerOrder({ id: 7, status: 'RETURNED', statusLabel: 'Qaytarildi', canCancel: false });
    assert.deepEqual(shown, { id: 7, status: 'CANCELLED', statusLabel: null, canCancel: false });
    const delivered = { id: 8, status: 'DELIVERED' };
    assert.equal(toCustomerOrder(delivered), delivered);
    assert.equal(toCustomerOrder(null), null);
  });

  it('eski server uchun birinchi bo‘sh yetkazish vaqti', () => {
    const { firstFreeSlot } = require('../src/features/checkout');
    const days = [
      { date: '2026-11-15', slots: [{ slot: '10:00-14:00', available: false }] },
      { date: '2026-11-16', slots: [{ slot: '10:00-14:00', available: false }, { slot: '18:00-22:00', available: true }] },
    ];
    assert.deepEqual(firstFreeSlot(days), { deliveryDate: '2026-11-16', deliverySlot: '18:00-22:00' });
    assert.equal(firstFreeSlot([]), null);
    assert.equal(firstFreeSlot(undefined), null);
  });
});
