import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateProfileDto } from './register.dto';

// setup-app.ts dagi global pipe bilan bir xil sozlamalar
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: true });
const meta: ArgumentMetadata = { type: 'body', metatype: UpdateProfileDto };

const validate = (body: unknown) => pipe.transform(body, meta);

describe('UpdateProfileDto (PATCH /auth/me)', () => {
  it('fullName qabul qilinadi va bo\'shliqlari tozalanadi', async () => {
    const dto = await validate({ fullName: '  Aziz   Rahimov ', gender: 'MALE', age: 25 });
    expect(dto).toEqual({ fullName: 'Aziz Rahimov', gender: 'MALE', age: 25 });
  });

  it('fullName ixtiyoriy — faqat o\'lchamlar yuborilsa ham o\'tadi', async () => {
    await expect(validate({ height: 178, weight: 72 })).resolves.toEqual({ height: 178, weight: 72 });
  });

  it.each([
    ['juda qisqa', 'A'],
    ['juda uzun', 'x'.repeat(101)],
    ['HTML', '<b>Aziz</b>'],
    ['null (ustun majburiy)', null],
    ['raqam', 42],
  ])('fullName rad etiladi: %s', async (_, fullName) => {
    await expect(validate({ fullName })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('boshqa maydonlar hamon taqiqlangan', async () => {
    await expect(validate({ fullName: 'Aziz', phone: '+998901234567' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
