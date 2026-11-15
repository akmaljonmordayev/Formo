import { describe, expect, it } from 'vitest';
import { toCyrillic, translate } from './i18n';
import RU from './i18n.ru';

describe('Superadmin i18n', () => {
  it("o'zbekcha — matn o'zgarmaydi, o'zgaruvchilar qo'yiladi", () => {
    expect(translate('uz', 'Buyurtmalar')).toBe('Buyurtmalar');
    expect(translate('uz', '{n} ta sotildi', { n: 5 })).toBe('5 ta sotildi');
  });

  it('kirill — lotindan avtomatik transliteratsiya', () => {
    expect(toCyrillic("Ko'rinadi")).toBe('Кўринади');
    expect(toCyrillic('Yetkazish')).toBe('Етказиш');
    expect(toCyrillic("Sig'im")).toBe('Сиғим');
    expect(toCyrillic('Ishlab chiqarish')).toBe('Ишлаб чиқариш');
    expect(toCyrillic("Ma'lumot")).toBe('Маълумот');
    expect(toCyrillic('Eksport')).toBe('Экспорт');
    // qisqartma va {o'zgaruvchi} tegilmaydi
    expect(toCyrillic('SMS {name} yuborildi')).toBe('SMS {name} юборилди');
    expect(translate('oz', 'Xayrli kun, {name}', { name: 'Ali' })).toBe('Хайрли кун, Ali');
  });

  it("ruscha — lug'atdan, topilmasa o'zbekchaga qaytadi; apostrof turlari bir xil", () => {
    expect(translate('ru', 'Buyurtmalar')).toBe('Заказы');
    expect(translate('ru', 'O‘chirish')).toBe(RU["O'chirish"]);
    expect(translate('ru', 'Mavjud emas kalit')).toBe('Mavjud emas kalit');
    expect(translate('ru', '{group} · {season} mavsumi · {n} ta sotildi', { group: 'LaLiga', season: '2026/27', n: 3 })).toBe(
      'LaLiga · сезон 2026/27 · продано 3',
    );
  });

  it("ruscha lug'atda bo'sh qiymat yo'q", () => {
    Object.entries(RU).forEach(([k, v]) => {
      expect(typeof v, k).toBe('string');
      expect(v.trim().length, k).toBeGreaterThan(0);
    });
  });
});
