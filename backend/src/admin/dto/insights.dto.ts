import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class RangeQueryDto {
  @ApiPropertyOptional({ enum: [1, 7, 30, 90], default: 30, description: "Davr (kun)" })
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 7, 30, 90])
  days?: number = 30;
}
