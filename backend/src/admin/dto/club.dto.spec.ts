import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { ListClubsQueryDto, UpdateClubDto } from './club.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: true });
const update = (body: unknown) => pipe.transform(body, { type: 'body', metatype: UpdateClubDto } as ArgumentMetadata);

describe('UpdateClubDto — kit360Id (Forma 360° bog\'lanishi)', () => {
  it.each(['rm', 'mu', 'psg', 'es'])("ro'yxatdagi id qabul qilinadi: %s", async (kit360Id) => {
    await expect(update({ kit360Id })).resolves.toMatchObject({ kit360Id });
  });

  it("null — bog'lanishni olib tashlaydi", async () => {
    await expect(update({ kit360Id: null })).resolves.toMatchObject({ kit360Id: null });
  });

  it.each(['xx', 'RM', '', 7])("noma'lum id — 400: %s", async (kit360Id) => {
    await expect(update({ kit360Id })).rejects.toBeInstanceOf(BadRequestException);
  });
});

const listQuery = (query: unknown) => pipe.transform(query, { type: 'query', metatype: ListClubsQueryDto } as ArgumentMetadata);

describe('ListClubsQueryDto — kit360Id filtri', () => {
  it.each(['rm', 'any'])('qabul qilinadi: %s', async (kit360Id) => {
    await expect(listQuery({ kit360Id })).resolves.toMatchObject({ kit360Id });
  });

  it("noma'lum qiymat — 400", async () => {
    await expect(listQuery({ kit360Id: 'xx' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

const baseKit = { label: 'Uy', bgColor: '#0e1a3f', textColor: '#ffffff' };

describe("KitDto — sizePrices (o'lcham bo'yicha narx)", () => {
  it("to'g'ri kalit/qiymat qabul qilinadi", async () => {
    const sizePrices = { S: 150000, M: 150000, XXL: 170000 };
    await expect(update({ kits: [{ ...baseKit, sizePrices }] })).resolves.toMatchObject({ kits: [{ sizePrices }] });
  });

  it("berilmasa ham xato bermaydi (ixtiyoriy)", async () => {
    await expect(update({ kits: [baseKit] })).resolves.toMatchObject({ kits: [{}] });
  });

  it("noma'lum o'lcham kaliti — 400", async () => {
    await expect(update({ kits: [{ ...baseKit, sizePrices: { XXXXL: 150000 } }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("manfiy yoki butun bo'lmagan narx — 400", async () => {
    await expect(update({ kits: [{ ...baseKit, sizePrices: { S: -1 } }] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(update({ kits: [{ ...baseKit, sizePrices: { S: 1.5 } }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("massiv yoki satr — 400", async () => {
    await expect(update({ kits: [{ ...baseKit, sizePrices: ['S'] }] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(update({ kits: [{ ...baseKit, sizePrices: 'S' }] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
