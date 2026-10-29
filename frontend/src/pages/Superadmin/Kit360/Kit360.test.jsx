import { describe, expect, it } from 'vitest';
import { cleanName, cleanNumber } from './index';

describe('Forma 360° — ism va raqam', () => {
  it('ism: katta harf, lotin/kirill, 12 belgigacha, raqam va belgilar olib tashlanadi', () => {
    expect(cleanName('isroil')).toBe('ISROIL');
    expect(cleanName("o'g'li 7!")).toBe("O'G'LI ");
    expect(cleanName('Исроил')).toBe('ИСРОИЛ');
    expect(cleanName('Gʻofur')).toBe('GʻOFUR');
    expect(cleanName('abcdefghijklmnop')).toHaveLength(12);
  });

  it('raqam: faqat 1–99, boshidagi nol olib tashlanadi', () => {
    expect(cleanNumber('10')).toBe('10');
    expect(cleanNumber('07')).toBe('7');
    expect(cleanNumber('0')).toBe('');
    expect(cleanNumber('123')).toBe('12');
    expect(cleanNumber('a9b')).toBe('9');
  });
});
