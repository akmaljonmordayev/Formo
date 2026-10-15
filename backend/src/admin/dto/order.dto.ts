import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CleanText } from '../../common/utils/no-html';

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ description: "Raqam, telefon yoki ism bo'yicha qidiruv" })
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Tikuv sexi (workshop) id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workshopId?: number;

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

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Qayta belgilanadigan tikuv sexi (ixtiyoriy)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workshopId?: number;
}
