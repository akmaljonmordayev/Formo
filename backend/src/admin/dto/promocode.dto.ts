import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PromocodeType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreatePromocodeDto {
  @ApiProperty({ example: 'FORMO10' })
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,20}$/, { message: "Kod faqat katta harf, raqam, - va _ dan iborat bo'lishi kerak (3-20 belgi)" })
  code: string;

  @ApiProperty({ enum: PromocodeType })
  @IsEnum(PromocodeType)
  type: PromocodeType;

  @ApiPropertyOptional({ description: 'PERCENT: 0-100, FIXED: so\'m', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ description: "Minimal buyurtma summasi (so'm)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSum?: number;

  @ApiPropertyOptional({ description: 'Ishlatish limiti' })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageCap?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class UpdatePromocodeDto extends PartialType(CreatePromocodeDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
