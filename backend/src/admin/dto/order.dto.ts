import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
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

  @ApiPropertyOptional({ enum: PaymentStatus, description: "To'lov holati bo'yicha filtr (operator To'lovlar sahifasi)" })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

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
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Holat tarixiga yoziladigan izoh', maxLength: 500 })
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'Qayta belgilanadigan tikuv sexi (ixtiyoriy)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workshopId?: number;
}

export class AssignWorkshopDto {
  @ApiProperty({ description: 'Tikuv sexi (TAILOR) id', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workshopId: number;

  @ApiPropertyOptional({ description: 'Sex uchun izoh', example: "Ertaga 12:00 gacha tayyor bo'lsin", maxLength: 500 })
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Tikuv sexi o'z buyurtmalari ro'yxatida — boshqa sex bo'yicha filtr kerak emas */
export class WorkshopOrdersQueryDto extends OmitType(ListOrdersQueryDto, ['workshopId', 'paymentStatus'] as const) {}

export class RejectOrderDto {
  @ApiProperty({ description: 'Rad etish sababi (operatorga ko‘rinadi)', example: "Bu o'lchamdagi mato tugagan", maxLength: 500 })
  @CleanText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

/** Sex o'zi o'rnata oladigan holatlar — faqat oldinga, DELIVERING faqat READY dan keyin */
export const WORKSHOP_STATUSES = [
  OrderStatus.PRINTING,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
] as const;
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];

export class WorkshopStatusDto {
  @ApiProperty({
    enum: WORKSHOP_STATUSES,
    description:
      '`PRINTING` — bosilmoqda, `QUALITY_CHECK` — sifat nazorati, `READY` — tayyor bo‘ldi, ' +
      '`DELIVERING` — yetkazishga (kuryerga) berildi',
  })
  @IsIn(WORKSHOP_STATUSES)
  status: WorkshopStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(500)
  note?: string;
}
