import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

export class CheckoutDto {
  @ApiProperty({ example: 1, description: 'Saqlangan manzil id (GET /api/addresses)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId: number;

  @ApiProperty({ example: '2026-10-16', description: 'Yetkazish sanasi (GET /api/checkout/delivery-slots dan)' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sana YYYY-MM-DD formatida bo‘lishi kerak' })
  deliveryDate: string;

  @ApiProperty({ example: '10:00-14:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/, { message: "Yetkazish vaqti noto'g'ri" })
  deliverySlot: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CLICK })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'FORMO10' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || undefined : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,20}$/, { message: "Promokod noto'g'ri" })
  promocode?: string;

  @ApiPropertyOptional({ example: 'Domofon ishlamaydi, qo‘ng‘iroq qiling', description: 'Kuryer uchun izoh' })
  @IsOptional()
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(300)
  comment?: string;
}

export class ChangePaymentMethodDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class MyOrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class DeliverySlotsQueryDto {
  @ApiPropertyOptional({ default: 3, minimum: 1, maximum: 7, description: 'Necha kunlik slotlar (ertadan boshlab)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  days?: number = 3;
}
