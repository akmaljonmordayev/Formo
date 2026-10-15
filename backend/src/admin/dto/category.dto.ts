import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

export class CreateCategoryDto {
  @ApiProperty({ example: 'LaLiga' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 'laliga', description: "Berilmasa nomdan yasaladi" })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "Slug faqat kichik lotin harf, raqam va '-' dan iborat bo'lishi kerak" })
  @MaxLength(60)
  slug?: string;

  @ApiPropertyOptional({ default: 0, description: 'Filtrdagi tartib (kichigi oldinda)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
