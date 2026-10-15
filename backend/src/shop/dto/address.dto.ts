import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

export class CreateAddressDto {
  @ApiProperty({ example: 'Uy', description: 'Qisqa nom: Uy, Ish, ...' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(1)
  @MaxLength(30)
  label: string;

  @ApiProperty({ example: 'Yunusobod, Amir Temur 108' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  @ApiPropertyOptional({ example: '45-xonadon' })
  @IsOptional()
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(60)
  apartment?: string;

  @ApiPropertyOptional({ example: 41.3667 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 69.2841 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Asosiy manzil qilib belgilash' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
