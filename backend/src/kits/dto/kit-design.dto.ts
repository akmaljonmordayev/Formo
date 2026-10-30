import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';
import { KIT_DESIGN_VERSION, KIT_NECKS, KIT_PATTERNS } from '../kit-design';

const HEX = /^#[0-9a-f]{6}$/;
const lower = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
const emptyToNull = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value));

/** Dizayn (v1). Rasm manzillari faqat shu server bergan yuklash manzillari bo'lishi kerak (servis tekshiradi) */
export class KitDesignBodyDto {
  @ApiPropertyOptional({ enum: [KIT_DESIGN_VERSION], default: KIT_DESIGN_VERSION })
  @IsOptional()
  @IsIn([KIT_DESIGN_VERSION], { message: "Dizayn versiyasi qo'llab-quvvatlanmaydi" })
  designVersion?: number;

  @ApiProperty({ example: 'Oqim 2026' })
  @CleanText()
  @IsString()
  @NoHtml()
  @Length(2, 40, { message: "Nomi 2-40 belgidan iborat bo'lishi kerak" })
  name: string;

  @ApiProperty({ example: '#1f6f8b' })
  @lower()
  @Matches(HEX, { message: "Asosiy rang #rrggbb ko'rinishida bo'lishi kerak" })
  primaryColor: string;

  @ApiProperty({ example: '#0b1d2a' })
  @lower()
  @Matches(HEX, { message: "Ikkinchi rang #rrggbb ko'rinishida bo'lishi kerak" })
  secondaryColor: string;

  @ApiProperty({ example: '#e3c27a' })
  @lower()
  @Matches(HEX, { message: "Yozuv rangi #rrggbb ko'rinishida bo'lishi kerak" })
  textColor: string;

  @ApiProperty({ enum: KIT_PATTERNS })
  @IsIn(KIT_PATTERNS, { message: "Naqsh noto'g'ri" })
  pattern: string;

  @ApiProperty({ enum: KIT_NECKS })
  @IsIn(KIT_NECKS, { message: "Yoqa turi noto'g'ri" })
  neck: string;

  @ApiPropertyOptional({ example: 'KARVON', maxLength: 20 })
  @IsOptional()
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(20, { message: 'Homiy matni 20 belgidan oshmasin' })
  sponsorText?: string;

  @ApiPropertyOptional({ example: 'TURON FC', maxLength: 20, description: 'Orqa tepasidagi kichik yozuv' })
  @IsOptional()
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(20, { message: 'Orqa tepadagi yozuv 20 belgidan oshmasin' })
  backTopText?: string;

  @ApiPropertyOptional({ nullable: true, description: 'POST /admin/kit-designs/uploads javobidagi url' })
  @IsOptional()
  @emptyToNull()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  crestImageUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'POST /admin/kit-designs/uploads javobidagi url' })
  @IsOptional()
  @emptyToNull()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  sponsorImageUrl?: string | null;
}

export class CreateKitDesignDto {
  @ApiProperty({ type: KitDesignBodyDto })
  // ValidateNested yo'q maydonni o'tkazib yuboradi — IsObject majburiy qiladi
  @IsObject({ message: 'Dizayn yuborilmadi' })
  @ValidateNested()
  @Type(() => KitDesignBodyDto)
  design: KitDesignBodyDto;

  @ApiPropertyOptional({ default: false, description: 'true — nashr qilingan (ilovada ko\'rinadi)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

/** Hammasi ixtiyoriy; `design` berilsa butunlay almashtiriladi */
export class UpdateKitDesignDto {
  @ApiPropertyOptional({ type: KitDesignBodyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => KitDesignBodyDto)
  design?: KitDesignBodyDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export const UPLOAD_KINDS = ['crest', 'sponsor'] as const;

export class UploadQueryDto {
  @ApiProperty({ enum: UPLOAD_KINDS })
  @IsIn(UPLOAD_KINDS, { message: "Rasm turi noto'g'ri" })
  kind: (typeof UPLOAD_KINDS)[number];
}
