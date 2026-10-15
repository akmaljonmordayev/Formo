import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ClubType, Continent } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';
import { ALL_SIZES } from '../../shop/pricing';

const MAX_PRICE = 10_000_000;

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const HEX_MESSAGE = 'Rang hex formatida bo\'lishi kerak, masalan #0e1a3f';

export class KitDto {
  @ApiProperty({ example: 'Uy' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(1)
  @MaxLength(30)
  label: string;

  @ApiProperty({ example: '#0e1a3f' })
  @IsString()
  @Matches(HEX_COLOR, { message: HEX_MESSAGE })
  bgColor: string;

  @ApiProperty({ example: '#ffffff' })
  @IsString()
  @Matches(HEX_COLOR, { message: HEX_MESSAGE })
  textColor: string;

  @ApiPropertyOptional({ example: 'Oq / oltin', description: "Kartochkadagi ranglar tavsifi" })
  @IsOptional()
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(60)
  colorsLabel?: string;

  @ApiPropertyOptional({ example: 'Dry-fit polyester · DTF bosma' })
  @IsOptional()
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 99000, description: "Futbolka narxi, so'm" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  shirtPrice?: number;

  @ApiPropertyOptional({ example: 60000, description: "Shortik narxi, so'm" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  shortsPrice?: number;

  @ApiPropertyOptional({ example: 30000, description: "Ism + raqam bosmasi narxi, so'm" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  printPrice?: number;

  @ApiPropertyOptional({ example: ['S', 'M', 'L', 'XL', '3XL'], enum: ALL_SIZES, isArray: true, description: "Sotuvda bor o'lchamlar" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ALL_SIZES.length)
  @ArrayUnique()
  @IsIn(ALL_SIZES, { each: true, message: "O'lcham noto'g'ri" })
  sizes?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Klubni tahrirlashda: id berilgan forma yangilanadi, id siz — yangi qo'shiladi, ro'yxatda yo'qlari o'chiriladi */
export class ClubKitDto extends KitDto {
  @ApiPropertyOptional({ description: 'Mavjud forma id (tahrirlashda)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;
}

export class UpdateKitDto extends PartialType(KitDto) {}

export class CreateClubDto {
  @ApiProperty({ example: 'Real Madrid' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 1, description: 'Kategoriya id. Berilmasa `league` nomi bo‘yicha topiladi yoki yaratiladi' })
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ example: 'LaLiga', description: '`categoryId` berilmasa majburiy' })
  @ValidateIf((o) => !o.categoryId || o.league !== undefined)
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(60)
  league?: string;

  @ApiProperty({ example: '2026/27' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(20)
  season: string;

  @ApiProperty({ example: 'RM', description: "Nishon ustidagi qisqa harf (2-4 ta belgi)" })
  @IsString()
  @MinLength(1)
  @MaxLength(4)
  code: string;

  @ApiProperty({ example: '#0e1a3f' })
  @IsString()
  @Matches(HEX_COLOR, { message: HEX_MESSAGE })
  markColor: string;

  @ApiPropertyOptional({ enum: ClubType, default: ClubType.CLUB, description: "Klub (liga jamoasi) yoki davlat terma jamoasi" })
  @IsOptional()
  @IsEnum(ClubType)
  type?: ClubType;

  @ApiPropertyOptional({ enum: Continent, description: "type=NATIONAL bo'lsa majburiy — terma jamoa shu qit'a bo'yicha filtrlanadi" })
  @ValidateIf((o) => (o.type ?? ClubType.CLUB) === ClubType.NATIONAL)
  @IsEnum(Continent)
  continent?: Continent;

  @ApiProperty({ type: [ClubKitDto], minItems: 1, maxItems: 3 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ClubKitDto)
  kits: ClubKitDto[];
}

export class UpdateClubDto extends PartialType(CreateClubDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListClubsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(60)
  league?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ enum: ClubType })
  @IsOptional()
  @IsEnum(ClubType)
  type?: ClubType;

  @ApiPropertyOptional({ enum: Continent })
  @IsOptional()
  @IsEnum(Continent)
  continent?: Continent;

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
  limit?: number = 50;
}
