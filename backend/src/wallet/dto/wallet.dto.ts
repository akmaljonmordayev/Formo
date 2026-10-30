import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TopUpMethod, TopUpStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';
import { TOPUP_MAX, TOPUP_MIN } from '../payment-config';

export class CreateTopUpDto {
  @ApiProperty({ example: 100000, minimum: TOPUP_MIN, maximum: TOPUP_MAX, description: "so'm" })
  @Type(() => Number)
  @IsInt({ message: "Summa butun son bo'lishi kerak" })
  @Min(TOPUP_MIN, { message: `Eng kam summa ${TOPUP_MIN.toLocaleString('ru-RU')} so'm` })
  @Max(TOPUP_MAX, { message: `Eng ko'p summa ${TOPUP_MAX.toLocaleString('ru-RU')} so'm` })
  amount: number;

  @ApiProperty({ enum: TopUpMethod })
  @IsEnum(TopUpMethod)
  method: TopUpMethod;
}

export class TopUpsQueryDto {
  @ApiPropertyOptional({ enum: TopUpStatus })
  @IsOptional()
  @IsEnum(TopUpStatus)
  status?: TopUpStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ApproveTopUpDto {
  @ApiPropertyOptional({ example: 50000, description: "Chekdagi haqiqiy summa so'rovdan farq qilsa (so'm)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Summa butun son bo'lishi kerak" })
  @Min(TOPUP_MIN)
  @Max(TOPUP_MAX)
  amount?: number;
}

export class RejectTopUpDto {
  @ApiProperty({ example: "Chekdagi summa so'rovga mos emas" })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(3, { message: 'Rad etish sababini yozing' })
  @MaxLength(300)
  reason: string;
}
