import { describe, expect, it } from 'vitest';
import { LANGS, orderDeadline, translate } from './i18n';

describe('Tailor translations', () => {
  it('supports Uzbek Cyrillic while preserving API placeholders', () => {
    expect(LANGS.map((language) => language.value)).toEqual(['uz', 'ru', 'uz-Cyrl']);
    expect(translate('uz-Cyrl', 'nav.queue')).toBe('Бугунги навбат');
    expect(translate('uz-Cyrl', 'api.loading')).toBe('Маълумотлар API дан юкланмоқда...');
    expect(translate('uz-Cyrl', 'stock.cell.nol')).toBe('НОЛ');
    expect(translate('uz-Cyrl', 'note.orderStatus.text', { code: 'F-102', status: 'Босилди' }))
      .toBe('№F-102 · Босилди');
  });
});

describe('orderDeadline', () => {
  const t = (key, vars) => translate('uz', key, vars);
  t.locale = 'uz-UZ';
  const now = new Date(2026, 10, 1, 8, 30); // 2026-11-01 08:30

  it('bugungi slotgacha qolgan soat va daqiqani ko‘rsatadi (undefined emas)', () => {
    const text = orderDeadline(t, { deliveryTime: '2026-11-01', deadline: { time: '10:00-14:00', done: false } }, now);
    expect(text).toBe('Bugun, 10:00-14:00 · 1 soat 30 daqiqa');
  });

  it('o‘tgan sana "Bugun" deb ko‘rsatilmaydi va qolgan vaqt yozilmaydi', () => {
    const text = orderDeadline(t, { deliveryTime: '2026-10-25', deadline: { time: '10:00-14:00', done: false } }, now);
    expect(text).not.toMatch(/Bugun|undefined|soat/);
    expect(text).toContain('10:00-14:00');
  });

  it('tayyor buyurtma', () => {
    const text = orderDeadline(t, { deliveryTime: '2026-11-01', deadline: { time: '10:00-14:00', done: true } }, now);
    expect(text).toBe("Bugun, 10:00-14:00 · Tayyor bo'ldi");
  });
});
