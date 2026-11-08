import { describe, expect, it } from 'vitest';
import { LANGS, orderDeadline, translate } from './i18n';

describe('Tailor translations', () => {
  it('supports Uzbek Cyrillic while preserving API placeholders', () => {
    expect(LANGS.map((language) => language.value)).toEqual(['uz', 'uz-New', 'uz-Cyrl', 'ru', 'en']);
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

describe('Tailor: inglizcha va yangi alifbo', () => {
  it("inglizcha — lug'atdan; ruscha lug'atdagi har bir kalit va {placeholder}lar inglizchada ham bor", async () => {
    const { default: en } = await import('./i18n.en');
    expect(translate('en', 'nav.queue')).toBe("Today's queue");
    expect(translate('en', 'note.orderStatus.text', { code: 'F-1', status: 'Ready' })).toBe('№F-1 · Ready');
    const vars = (v) => (String(v).match(/\{\w+\}/g) || []).sort().join(',');
    for (const [k, v] of Object.entries(en)) expect(vars(v), k).toBe(vars(translate('ru', k)));
    const enKeys = Object.keys(en);
    expect(enKeys.length).toBeGreaterThan(400);
  });

  it("yangi alifbo — o'zbekcha matndan avtomatik (Ō, Ḡ, Ş, Ç)", () => {
    expect(translate('uz-New', 'nav.queue')).toBe('Bugungi navbat');
    expect(translate('uz-New', 'nav.logout')).toBe(translate('uz', 'nav.logout').replace(/Ch/g, 'Ç').replace(/ch/g, 'ç').replace(/Sh/g, 'Ş').replace(/sh/g, 'ş').replace(/[oO]['‘’ʻ]/g, (m) => (m[0] === 'o' ? 'ō' : 'Ō')).replace(/[gG]['‘’ʻ]/g, (m) => (m[0] === 'g' ? 'ḡ' : 'Ḡ')));
    expect(translate('uz-New', 'shell.markAllRead')).not.toMatch(/o[‘'’ʻ]/);
  });
});
