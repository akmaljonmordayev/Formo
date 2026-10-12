import { normalizePhone, UZ_PHONE_REGEX } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['+998 90 123-45-67', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['901234567', '+998901234567'],
    ['(90) 123 45 67', '+998901234567'],
    ['+998901234567', '+998901234567'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("noto'g'ri uzunlikdagi raqam o'zgarishsiz (trim bilan) qaytadi — validator ushlaydi", () => {
    expect(normalizePhone('  12345 ')).toBe('12345');
    expect(normalizePhone('+7 999 123 45 67')).toBe('+7 999 123 45 67');
    expect(UZ_PHONE_REGEX.test(normalizePhone('+7 999 123 45 67') as string)).toBe(false);
  });

  it('string bo‘lmagan qiymatga tegmaydi', () => {
    expect(normalizePhone(901234567)).toBe(901234567);
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeUndefined();
  });
});

describe('UZ_PHONE_REGEX', () => {
  it.each(['+998901234567', '+998330000000'])('qabul qiladi: %s', (p) => expect(UZ_PHONE_REGEX.test(p)).toBe(true));
  it.each(['998901234567', '+99890123456', '+9989012345678', '+998 90 123 45 67', '+99890123456a'])(
    'rad etadi: %s',
    (p) => expect(UZ_PHONE_REGEX.test(p)).toBe(false),
  );
});
