import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateKitDesignDto, UpdateKitDesignDto, UploadQueryDto } from './kit-design.dto';

// setup-app.ts dagi global pipe bilan bir xil sozlamalar
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: true });
const create = (body: unknown) => pipe.transform(body, { type: 'body', metatype: CreateKitDesignDto } as ArgumentMetadata);
const update = (body: unknown) => pipe.transform(body, { type: 'body', metatype: UpdateKitDesignDto } as ArgumentMetadata);

const design = {
  name: '  Oqim   2026 ',
  primaryColor: '#1F6F8B',
  secondaryColor: '#0b1d2a',
  textColor: '#e3c27a',
  pattern: 'fade',
  neck: 'round',
  sponsorText: 'Karvon',
};

describe('CreateKitDesignDto (POST /admin/kit-designs)', () => {
  it("to'g'ri dizayn qabul qilinadi: nom tozalanadi, rang kichik harfga o'tadi", async () => {
    const dto = await create({ design, isActive: true, sortOrder: 2 });
    expect(dto.design).toMatchObject({ name: 'Oqim 2026', primaryColor: '#1f6f8b', pattern: 'fade', neck: 'round' });
    expect(dto).toMatchObject({ isActive: true, sortOrder: 2 });
  });

  it("bo'sh rasm manzili null bo'ladi", async () => {
    const dto = await create({ design: { ...design, crestImageUrl: ' ', sponsorImageUrl: null } });
    expect(dto.design.crestImageUrl).toBeNull();
    expect(dto.design.sponsorImageUrl).toBeNull();
  });

  it.each([
    ['rang hex emas', { primaryColor: 'red' }],
    ['rang qisqa hex', { secondaryColor: '#fff' }],
    ["noma'lum naqsh", { pattern: 'zigzag' }],
    ["noma'lum yoqa", { neck: 'polo' }],
    ['nom juda qisqa', { name: 'A' }],
    ['nom juda uzun', { name: 'x'.repeat(41) }],
    ['nomda HTML', { name: '<b>Oqim</b>' }],
    ['homiy matnida skript', { sponsorText: 'javascript:alert(1)' }],
    ['homiy matni uzun', { sponsorText: 'x'.repeat(21) }],
    ['orqa yozuv uzun', { backTopText: 'x'.repeat(21) }],
    ["noma'lum versiya", { designVersion: 2 }],
    ["ortiqcha maydon (narx)", { price: 1000 }],
  ])('rad etiladi: %s', async (_, patch) => {
    await expect(create({ design: { ...design, ...patch } })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('dizaynsiz yoki ortiqcha ildiz maydoni bilan — 400', async () => {
    await expect(create({ isActive: true })).rejects.toBeInstanceOf(BadRequestException);
    await expect(create({ design, thumbnailUrl: 'https://evil/x.png' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UpdateKitDesignDto (PATCH /admin/kit-designs/:id)', () => {
  it('faqat nashr holati yoki tartib yuborilishi mumkin', async () => {
    await expect(update({ isActive: false })).resolves.toEqual({ isActive: false });
    await expect(update({ sortOrder: '5' })).resolves.toEqual({ sortOrder: 5 });
  });

  it("isActive matn bo'lsa yoki tartib manfiy bo'lsa — 400", async () => {
    await expect(update({ isActive: 'yes' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(update({ sortOrder: -1 })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UploadQueryDto', () => {
  const query = (q: unknown) => pipe.transform(q, { type: 'query', metatype: UploadQueryDto } as ArgumentMetadata);
  it('faqat crest yoki sponsor', async () => {
    await expect(query({ kind: 'crest' })).resolves.toEqual({ kind: 'crest' });
    await expect(query({ kind: 'thumb' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
