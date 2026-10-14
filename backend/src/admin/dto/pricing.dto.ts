import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

export class PricingItemInput {
  @ApiProperty({ example: 'club.tshirt' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Klub formasi' })
  @CleanText()
  @IsString()
  @NoHtml()
  section: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  step: number;

  @ApiProperty({ example: 'Futbolka' })
  @CleanText()
  @IsString()
  @NoHtml()
  label: string;

  @ApiProperty({ example: "Barcha o'lchamlar: 2-13 yosh va S-3XL" })
  @CleanText()
  @IsString()
  @NoHtml()
  sub: string;

  @ApiProperty({ example: 99000 })
  @IsInt()
  @Min(0)
  price: number;
}

export class UpsertPricingDto {
  @ApiProperty({ type: [PricingItemInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PricingItemInput)
  items: PricingItemInput[];
}
