import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { ListCatalogClubsQueryDto, PopularClubsQueryDto } from './catalog.dto';

// setup-app.ts dagi global pipe bilan bir xil sozlamalar
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: true });
const parse = (metatype: unknown, query: unknown) => pipe.transform(query, { type: 'query', metatype } as ArgumentMetadata);

describe('Katalog query — kit360 filtri', () => {
  it.each([
    ['true', true],
    ['false', false],
  ])('kit360=%s → %s', async (raw, expected) => {
    await expect(parse(ListCatalogClubsQueryDto, { kit360: raw })).resolves.toMatchObject({ kit360: expected });
    await expect(parse(PopularClubsQueryDto, { kit360: raw })).resolves.toMatchObject({ kit360: expected });
  });

  it("yuborilmasa — undefined (filtrsiz)", async () => {
    expect((await parse(ListCatalogClubsQueryDto, {})).kit360).toBeUndefined();
  });

  it("noto'g'ri qiymat — 400", async () => {
    await expect(parse(ListCatalogClubsQueryDto, { kit360: 'yes' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
