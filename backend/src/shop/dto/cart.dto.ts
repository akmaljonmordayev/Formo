import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';
import { ALL_SIZES } from '../pricing';

export const MAX_ITEM_QTY = 20;
const upper = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));
const emptyToNull = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value));

export class CartItemOptionsDto {
  @ApiPropertyOptional({ example: 'AZIZ', description: "Orqadagi ism (bo'sh qoldirilsa bosma narxi qo'shilmaydi)" })
  @IsOptional()
  @emptyToNull()
  @CleanText()
  @upper()
  @IsString()
  @NoHtml()
  @Matches(/^[\p{L}\p{M} .'’-]{1,12}$/u, { message: "Ism 1-12 ta harfdan iborat bo'lishi kerak" })
  printName?: string | null;

  @ApiPropertyOptional({ example: '10', description: 'Raqam: 0-99' })
  @IsOptional()
  @emptyToNull()
  @IsString()
  @Matches(/^\d{1,2}$/, { message: "Raqam 0 dan 99 gacha bo'lishi kerak" })
  printNumber?: string | null;

  @ApiPropertyOptional({ default: false, description: 'Shortikka ham raqam (chap oyoq, old tomonda)' })
  @IsOptional()
  @IsBoolean()
  numberOnShorts?: boolean;

  @ApiPropertyOptional({ example: '7', description: "Shortikdagi raqam: 0-99 (berilmasa — futbolka raqami). Faqat numberOnShorts=true bo'lsa" })
  @IsOptional()
  @emptyToNull()
  @IsString()
  @Matches(/^\d{1,2}$/, { message: "Shortik raqami 0 dan 99 gacha bo'lishi kerak" })
  shortsNumber?: string | null;

  @ApiPropertyOptional({ description: "To'plamga shortik qo'shilsinmi (klub formasi: standart true, maxsus dizayn: false)" })
  @IsOptional()
  @IsBoolean()
  withShorts?: boolean;

  @ApiPropertyOptional({ example: 'L', enum: ALL_SIZES, description: "Shortik o'lchami (withShorts=true bo'lsa majburiy)" })
  @IsOptional()
  @upper()
  @IsIn(ALL_SIZES, { message: "Shortik o'lchami noto'g'ri" })
  shortsSize?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: MAX_ITEM_QTY })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QTY)
  quantity?: number;
}

export class AddCartItemDto extends CartItemOptionsDto {
  @ApiPropertyOptional({ example: 1, description: 'Klub formasi (kit) id. `design` bilan birga yuborilmaydi' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  kitId?: number;

  @ApiPropertyOptional({
    description:
      "Dizayn studiyasidagi maxsus futbolka (kitId o'rniga): `{ color: { type: 'solid'|'gradient'|'custom', id?, hex? }, font?, patch?, package? }`. " +
      "Variantlar va narxlar `GET /app/config` → `studio`.",
  })
  @IsOptional()
  @IsObject()
  design?: Record<string, unknown>;

  @ApiProperty({ example: 'L', enum: ALL_SIZES, description: "Futbolka o'lchami" })
  @upper()
  @IsIn(ALL_SIZES, { message: "Futbolka o'lchami noto'g'ri" })
  shirtSize: string;
}

export class UpdateCartItemDto extends CartItemOptionsDto {
  @ApiPropertyOptional({ example: 'L', enum: ALL_SIZES, description: "Futbolka o'lchami" })
  @IsOptional()
  @upper()
  @IsIn(ALL_SIZES, { message: "Futbolka o'lchami noto'g'ri" })
  shirtSize?: string;
}

export class CartQueryDto {
  @ApiPropertyOptional({ example: 'FORMO10', description: "Qo'llanadigan promokod (noto'g'ri bo'lsa 400)" })
  @IsOptional()
  @upper()
  @IsString()
  @MaxLength(20)
  promocode?: string;
}

export class ApplyPromocodeDto {
  @ApiProperty({ example: 'FORMO10' })
  @upper()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,20}$/, { message: "Promokod noto'g'ri" })
  code: string;
}
