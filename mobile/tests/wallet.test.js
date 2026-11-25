const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { TX_META } = require('../src/features/wallet');
const { CHECKOUT_METHODS } = require('../src/features/orders');

describe('balans va checkout', () => {
  it('checkout faqat karta yoki naqd; balans va provayderlar yo‘q', () => {
    assert.deepEqual(CHECKOUT_METHODS, ['CARD', 'CASH']);
    assert.ok(!CHECKOUT_METHODS.includes('CLICK') && !CHECKOUT_METHODS.includes('PAYME'));
    assert.ok(!CHECKOUT_METHODS.includes('BALANCE'));
  });

  it('saqlangan balans tarixining harakat turlari aniqlangan', () => {
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
