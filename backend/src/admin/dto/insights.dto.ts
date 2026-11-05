import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, Matches } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class RangeQueryDto {
  @ApiPropertyOptional({ enum: [1, 7, 30, 90], default: 30, description: "Davr (kun)" })
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 7, 30, 90])
  days?: number;

  @ApiPropertyOptional({ example: '2026-11-01', description: "Boshlanish sanasi (YYYY-MM-DD). `to` bilan birga — `days` o'rniga" })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'from YYYY-MM-DD formatida bo\'lishi kerak' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-04', description: 'Tugash sanasi (YYYY-MM-DD), shu kun ham kiradi' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'to YYYY-MM-DD formatida bo\'lishi kerak' })
  to?: string;
}
