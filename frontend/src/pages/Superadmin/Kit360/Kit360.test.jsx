import { describe, expect, it } from 'vitest';
import { FONTS, bannedWordIn, cleanName, cleanNumber, fitFont, fontCss, printText } from './index';

describe('Forma 360° — ism va raqam', () => {
  it('ism: katta harf, lotin/kirill, raqam va belgilar olib tashlanadi', () => {
    expect(cleanName('isroil')).toBe('ISROIL');
    expect(cleanName("o'g'li 7!")).toBe("O'G'LI ");
    expect(cleanName('Исроил')).toBe('ИСРОИЛ');
  });

  it("ism: o'zbek apostrofining barcha turlari bitta ' ga", () => {
    expect(cleanName('o`ktam')).toBe("O'KTAM");
    expect(cleanName('gʼofur')).toBe("G'OFUR");
    expect(cleanName('Gʻofur')).toBe("G'OFUR");
    expect(cleanName('o‘ktam')).toBe("O'KTAM");
  });

  it("ism: kirill va o'zbek kirill harflari (Й Ў Қ Ғ Ҳ Щ)", () => {
    expect(cleanName('йўлдошев')).toBe('ЙЎЛДОШЕВ');
    expect(cleanName('қодиров')).toBe('ҚОДИРОВ');
    expect(cleanName('щукин')).toBe('ЩУКИН');
    expect(cleanName('ғофур ҳамид')).toBe('ҒОФУР ҲАМИД');
  });

  it("ism: uzunlik tozalashdan keyin kesiladi, ortiqcha bo'shliqlar yig'iladi", () => {
    expect(cleanName('abcdefghijklmnop')).toHaveLength(12);
    expect(cleanName('a1b2c3d4e5f6g7h8', 5)).toBe('ABCDE');
    expect(cleanName('  ali   vali')).toBe('ALI VALI');
    expect(printText(' ALI  VALI ')).toBe('ALI VALI');
  });

  it("raqam: 0 va oraliq [min, max], boshidagi nol olib tashlanadi", () => {
    expect(cleanNumber('0')).toBe('0');
    expect(cleanNumber('00')).toBe('0');
    expect(cleanNumber('07')).toBe('7');
    expect(cleanNumber('99')).toBe('99');
    expect(cleanNumber('123')).toBe('12');
    expect(cleanNumber('a9b')).toBe('9');
    expect(cleanNumber('0', 1, 99)).toBe('0'); // ogohlantirish ko'rsatiladi, jim o'chirilmaydi
    expect(cleanNumber('77', 1, 50)).toBe('7');
    expect(cleanNumber('123', 0, 150)).toBe('123');
  });

  it("taqiqlangan so'z — katta-kichik harf va apostrof turidan qat'i nazar", () => {
    expect(bannedWordIn('ISROIL', ['roil'])).toBe('roil');
    expect(bannedWordIn("O'KTAM", ['oʻk'])).toBe('oʻk');
    expect(bannedWordIn('ALI', ['vali'])).toBeNull();
  });

  it("keng raqam (88) maxW dan chiqsa shrift kichrayadi, sig'sa o'zgarmaydi", () => {
    expect(fitFont(100, 300, 200)).toBeCloseTo(66.67, 1);
    expect(fitFont(100, 150, 200)).toBe(100);
    expect(fitFont(100, 300, 0)).toBe(100);
  });

  it('har shriftning zaxirasi — kirill harfli Oswald, Arial emas', () => {
    for (const f of FONTS) {
      const css = fontCss(f, 40);
      expect(css).toContain('Oswald');
      expect(css).not.toContain('Arial');
    }
  });
});
