import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CleanText } from '../../common/utils/no-html';

const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

/** ?kit360=true — faqat Forma 360° suratlariga bog'langan klublar (mobil katalog faqat shularni ko'rsatadi) */
export class Kit360FilterDto {
  @ApiPropertyOptional({ description: "true — faqat Forma 360° suratlari bor klublar (Club.kit360Id bog'langan)" })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  kit360?: boolean;
}

export class ListCatalogClubsQueryDto extends Kit360FilterDto {
  @ApiPropertyOptional({ description: 'Kategoriya (liga) id — "Barchasi" uchun yubormang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Kategoriya slug, masalan "laliga"', example: 'laliga' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,60}$/, { message: "Slug noto'g'ri" })
  category?: string;

  @ApiPropertyOptional({ description: "Klub nomi bo'yicha qidiruv (\"Klub qidirish\")" })
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class PopularClubsQueryDto extends Kit360FilterDto {
  @ApiPropertyOptional({ default: 8, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}
