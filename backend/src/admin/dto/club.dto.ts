import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

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
}

export class CreateClubDto {
  @ApiProperty({ example: 'Real Madrid' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'LaLiga' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(60)
  league: string;

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

  @ApiProperty({ type: [KitDto], minItems: 1, maxItems: 3 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => KitDto)
  kits: KitDto[];
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
