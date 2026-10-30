import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';
import { ALL_SIZES } from '../pricing';

export const MAX_ITEM_QTY = 20;
const upper = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));
const emptyToNull = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value));

/** Klaviaturadagi apostrof turlari (` ’ ‘ ʻ ʼ ´) bitta ' ga — O'KTAM / G'OFUR bazada va taqiqlangan so'zlar
 * tekshiruvida doim bir xil (admin Forma 360° dagi cleanName bilan bir xil qoida) */
export const normalizeApostrophes = (s: string) => s.replace(/[`’‘ʻʼ´]/g, "'");
const apostrophes = () => Transform(({ value }) => (typeof value === 'string' ? normalizeApostrophes(value) : value));

/**
 * Orqadagi ism: lotin (o'zbekcha o'/g' bilan) yoki kirill (o'zbek Ў Қ Ғ Ҳ ham) harflari, bo'shliq, nuqta, defis, apostrof.
 * Uzunlik chegarasi bu yerda faqat himoya uchun (30 — Sozlamalardagi maksimum); haqiqiy chegara
 * `order.rules.printNameMaxLength` — RulesService.assertLine tekshiradi.
 */
export const PRINT_NAME = /^[A-Za-zÀ-ɏЀ-ӿ .'-]{1,30}$/u;
/** Raqam: 0-999 gacha raqamlar; diapazon `order.rules.printNumberMin/Max` — RulesService.assertLine */
export const PRINT_NUMBER = /^\d{1,3}$/;

export class CartItemOptionsDto {
  @ApiPropertyOptional({ example: 'AZIZ', description: "Orqadagi ism (bo'sh qoldirilsa bosma narxi qo'shilmaydi)" })
  @IsOptional()
  @emptyToNull()
  @CleanText()
  @apostrophes()
  @upper()
  @IsString()
  @NoHtml()
  @Matches(PRINT_NAME, { message: "Ism lotin yoki kirill harflaridan iborat bo'lishi kerak" })
  printName?: string | null;

  @ApiPropertyOptional({ example: '10', description: 'Raqam: diapazon Sozlamalardagi printNumberMin..printNumberMax (standart 0-99)' })
  @IsOptional()
  @emptyToNull()
  @IsString()
  @Matches(PRINT_NUMBER, { message: "Raqam faqat raqamlardan iborat bo'lishi kerak" })
  printNumber?: string | null;

  @ApiPropertyOptional({ default: false, description: 'Shortikka ham raqam (chap oyoq, old tomonda)' })
  @IsOptional()
  @IsBoolean()
  numberOnShorts?: boolean;

  @ApiPropertyOptional({ example: '7', description: "Shortikdagi raqam: 0-99 (berilmasa — futbolka raqami). Faqat numberOnShorts=true bo'lsa" })
  @IsOptional()
  @emptyToNull()
  @IsString()
  @Matches(PRINT_NUMBER, { message: "Shortik raqami faqat raqamlardan iborat bo'lishi kerak" })
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

  @ApiPropertyOptional({
    example: 3,
    description: "Superadmin yasagan 3D dizayn id (GET /kits/designs). kitId/design bilan birga yuborilmaydi; narx serverda hisoblanadi",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  kitDesignId?: number;

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
