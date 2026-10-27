import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { AddCartItemDto } from './cart.dto';

// setup-app.ts dagi global pipe bilan bir xil sozlamalar
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: true });
const add = (body: unknown) => pipe.transform(body, { type: 'body', metatype: AddCartItemDto } as ArgumentMetadata);

describe('AddCartItemDto — 3D dizayn buyurtmasi (ism, raqam, o\'lcham)', () => {
  const base = { kitDesignId: 3, shirtSize: 'l' };

  it('ism katta harfga, o\'lcham katta harfga o\'tadi; kitDesignId son', async () => {
    const dto = await add({ ...base, kitDesignId: '3', printName: ' rahimov ', printNumber: '10' });
    expect(dto).toMatchObject({ kitDesignId: 3, shirtSize: 'L', printName: 'RAHIMOV', printNumber: '10' });
  });

  it.each(['RAHIMOV', "O'G'ILOV", 'O‘RINOV', 'ALI-VALI', 'АЛИЕВ', 'ҚОДИРОВ', 'ŞAHIN', 'ABCDEFGHIJKL'])(
    'lotin/kirill ism qabul qilinadi: %s',
    async (printName) => {
      await expect(add({ ...base, printName })).resolves.toMatchObject({ printName });
    },
  );

  it.each([
    ['13 ta harf', 'ABCDEFGHIJKLM'],
    ['raqamli', 'ALI7'],
    ['arab yozuvi', 'علي'],
    ['emoji', 'ALI😀'],
    ['HTML', '<b>ALI</b>'],
    ['skript', 'javascript:x'],
  ])('ism rad etiladi: %s', async (_, printName) => {
    await expect(add({ ...base, printName })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['0', '7', '99'])('raqam qabul qilinadi: %s', async (printNumber) => {
    await expect(add({ ...base, printNumber })).resolves.toMatchObject({ printNumber });
  });

  it.each(['100', '-1', '1.5', 'ab', '007'])('raqam rad etiladi: %s', async (printNumber) => {
    await expect(add({ ...base, printNumber })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['S', '3XL', '2-3', '12-13'])("o'lcham ro'yxatda: %s", async (shirtSize) => {
    await expect(add({ ...base, shirtSize })).resolves.toMatchObject({ shirtSize });
  });

  it.each(['XS', 'XXXL', '14-15', ''])("ro'yxatda yo'q o'lcham — 400: %s", async (shirtSize) => {
    await expect(add({ ...base, shirtSize })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("mijoz narx yoki foydalanuvchi id yubora olmaydi", async () => {
    await expect(add({ ...base, unitPrice: 1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(add({ ...base, userId: 1 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("kitDesignId musbat butun son bo'lishi kerak", async () => {
    await expect(add({ ...base, kitDesignId: 0 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(add({ ...base, kitDesignId: 'abc' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
