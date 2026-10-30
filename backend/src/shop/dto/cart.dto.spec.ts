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

  it.each(['RAHIMOV', "O'G'ILOV", 'ALI-VALI', 'АЛИЕВ', 'ҚОДИРОВ', 'ŞAHIN', 'ABCDEFGHIJKL', 'ЙЎЛДОШЕВ', 'ҒОФУР', 'ҲАМИД'])(
    'lotin/kirill ism qabul qilinadi: %s',
    async (printName) => {
      await expect(add({ ...base, printName })).resolves.toMatchObject({ printName });
    },
  );

  it.each([
    ['o`ktam', "O'KTAM"],
    ['O‘RINOV', "O'RINOV"],
    ['gʼofur', "G'OFUR"],
    ['Gʻofur', "G'OFUR"],
    ['o´ktam', "O'KTAM"],
  ])("apostrof turlari bitta ' ga (Forma 360° cleanName bilan bir xil): %s", async (printName, expected) => {
    await expect(add({ ...base, printName })).resolves.toMatchObject({ printName: expected });
  });

  it("13+ harfli ism DTO'dan o'tadi — uzunlik chegarasi order.rules.printNameMaxLength (RulesService)", async () => {
    await expect(add({ ...base, printName: 'ABCDEFGHIJKLM' })).resolves.toMatchObject({ printName: 'ABCDEFGHIJKLM' });
  });

  it.each([
    ['31 ta harf (himoya chegarasi)', 'A'.repeat(31)],
    ['raqamli', 'ALI7'],
    ['arab yozuvi', 'علي'],
    ['emoji', 'ALI😀'],
    ['HTML', '<b>ALI</b>'],
    ['skript', 'javascript:x'],
  ])('ism rad etiladi: %s', async (_, printName) => {
    await expect(add({ ...base, printName })).rejects.toBeInstanceOf(BadRequestException);
  });

  // Diapazon (standart 0-99) — order.rules.printNumberMin/Max, RulesService.assertLine; DTO faqat 1-3 raqam
  it.each(['0', '7', '99', '100', '07'])('raqam DTO dan o\'tadi: %s', async (printNumber) => {
    await expect(add({ ...base, printNumber })).resolves.toMatchObject({ printNumber });
  });

  it.each(['1000', '-1', '1.5', 'ab', '0007'])('raqam rad etiladi: %s', async (printNumber) => {
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

describe('AddCartItemDto — klub formasi shortiksiz', () => {
  it("withShorts=false + numberOnShorts=true — DTO qabul qiladi, CartService.normalize shortik raqamini tozalaydi", async () => {
    await expect(add({ kitId: 1, shirtSize: 'L', withShorts: false, numberOnShorts: true, shortsNumber: '7' })).resolves.toMatchObject({
      withShorts: false,
      numberOnShorts: true,
    });
  });
});
