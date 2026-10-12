import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CleanText, NoHtml } from './no-html';

class Sample {
  @CleanText()
  @NoHtml()
  text: unknown;
}

const build = (text: unknown) => plainToInstance(Sample, { text });
const isValid = (text: unknown) => validateSync(build(text)).length === 0;

describe('NoHtml', () => {
  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'Aziz onmouseover=alert(1)',
    'Aziz onclick = x',
    'data:text/html;base64,AAAA',
    'a > b',
  ])('rad etadi: %s', (payload) => {
    expect(isValid(payload)).toBe(false);
  });

  it.each(['Aziz Rahimov', "Ipak Yo'li Tikuv", 'Toshkent, Chilonzor 7-mavze, 12/3', 'Oneonta online', 'Иван Петров'])(
    'oddiy matnni qabul qiladi: %s',
    (text) => {
      expect(isValid(text)).toBe(true);
    },
  );

  it('string bo‘lmagan qiymatni boshqa validatorlarga qoldiradi', () => {
    expect(isValid(42)).toBe(true);
    expect(isValid(undefined)).toBe(true);
  });

  it('xato xabari o‘zbekcha', () => {
    const [error] = validateSync(build('<b>x</b>'));
    expect(error.constraints?.noHtml).toMatch(/HTML yoki skript/);
  });
});

describe('CleanText', () => {
  it('bo‘shliqlarni qirqadi va ketma-ket bo‘shliqlarni bittaga keltiradi', () => {
    expect(build('  Aziz \t  Rahimov \n ').text).toBe('Aziz Rahimov');
  });

  it('ko‘rinmas boshqaruv belgilarini olib tashlaydi', () => {
    expect(build('Az\u0000iz​ ‮Rahimov\u0007').text).toBe('Aziz Rahimov');
  });

  it('string bo‘lmagan qiymatga tegmaydi', () => {
    expect(build(7).text).toBe(7);
    expect(build(null).text).toBeNull();
  });
});
