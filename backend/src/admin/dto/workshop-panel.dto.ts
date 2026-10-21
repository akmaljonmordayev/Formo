import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DefectReason, DefectStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateDefectDto {
  @ApiProperty({ description: 'Sexga biriktirilgan buyurtma id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId: number;

  @ApiProperty({ enum: DefectReason })
  @IsEnum(DefectReason)
  reason: DefectReason;

  @ApiPropertyOptional({ default: 1, description: 'Nuqsonli dona soni' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  qty?: number = 1;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ListDefectsQueryDto {
  @ApiPropertyOptional({ enum: DefectStatus })
  @IsOptional()
  @IsEnum(DefectStatus)
  status?: DefectStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ResolveDefectDto {
  @ApiPropertyOptional({ description: 'Qanday hal qilingani', maxLength: 500 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateWorkshopProfileDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  workshopName?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(HHMM, { message: 'Vaqt HH:MM ko‘rinishida bo‘lishi kerak' })
  shiftStart?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(HHMM, { message: 'Vaqt HH:MM ko‘rinishida bo‘lishi kerak' })
  shiftEnd?: string;
}

export class CreateEmployeeDto {
  @ApiProperty({ maxLength: 120 })
  @CleanText()
  @NoHtml()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ example: 'Tikuvchi', maxLength: 60 })
  @CleanText()
  @NoHtml()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  role: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  role?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @CleanText()
  @NoHtml()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
