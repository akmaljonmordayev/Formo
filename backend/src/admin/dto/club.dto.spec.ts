import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateClubDto } from './club.dto';

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
