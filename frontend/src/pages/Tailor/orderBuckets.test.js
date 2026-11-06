import { describe, expect, it } from 'vitest';
import { groupActiveOrders, orderUrgency } from './orderBuckets';

// 2026-11-06 10:30 Toshkent (UTC+5)
const now = new Date('2026-11-06T05:30:00Z');
const order = (id, deliveryTime, slot, status = 'qabul') => ({
  id, status, deliveryTime, deadline: slot ? { time: slot } : null,
});

describe('orderUrgency', () => {
  it('o‘tgan sana — kechikkan, necha kun', () => {
    expect(orderUrgency(order('a', '2026-11-04', '10:00-14:00'), now)).toEqual({ bucket: 'late', daysLate: 2 });
  });
  it('bugun slot boshlanishi o‘tgan bo‘lsa — kechikkan', () => {
    expect(orderUrgency(order('a', '2026-11-06', '09:00-12:00'), now).bucket).toBe('late');
  });
  it('bugun slot hali boshlanmagan — bugungi navbat', () => {
    expect(orderUrgency(order('a', '2026-11-06', '14:00-18:00'), now).bucket).toBe('today');
  });
  it('ertaga — keyingi kunlar; sanasiz — nodate', () => {
    expect(orderUrgency(order('a', '2026-11-07', '10:00-14:00'), now).bucket).toBe('upcoming');
    expect(orderUrgency(order('a', null, null), now).bucket).toBe('nodate');
  });
  it('tayyor buyurtma kechikkan hisoblanmaydi', () => {
    expect(orderUrgency(order('a', '2026-11-01', '10:00-14:00', 'tayyor'), now).bucket).toBe('nodate');
  });
});

describe('groupActiveOrders', () => {
  it('tayyorlarni tashlab, muddat bo‘yicha tartiblaydi', () => {
    const g = groupActiveOrders([
      order('late2', '2026-11-05', '10:00-12:00'),
      order('late1', '2026-11-03', '10:00-12:00'),
      order('done', '2026-11-03', '10:00-12:00', 'tayyor'),
      order('today', '2026-11-06', '16:00-18:00', 'yangi'),
    ], now);
    expect(g.late.map((o) => o.id)).toEqual(['late1', 'late2']);
    expect(g.today.map((o) => o.id)).toEqual(['today']);
    expect(Object.values(g).flat()).toHaveLength(3);
  });
});
