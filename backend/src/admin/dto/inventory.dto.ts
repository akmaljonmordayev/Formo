import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { InventoryProductType } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ALL_SIZES } from '../../shop/pricing';

export class InventoryItemInput {
  @ApiProperty({ enum: InventoryProductType })
  @IsEnum(InventoryProductType)
  productType: InventoryProductType;

  @ApiProperty({ example: 1, description: 'Kit.id — klubning uy/mehmon/uchinchi formasi' })
  @IsInt()
  kitId: number;

  // Forma o'lchamlari bilan aynan bir xil yozuv ("M", "8-9"): "m" yoki "Medium" saqlansa qoldiq hech qachon
  // buyurtmaga mos kelmasdi (checkout va "tugagan" belgisi o'lchamni aniq solishtiradi)
  @ApiProperty({ example: 'M', enum: ALL_SIZES })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsIn(ALL_SIZES)
  size: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(0)
  @Max(999_999) // int ustuni chegarasidan oshsa 500 emas, 400
  qty: number;
}

export class UpsertInventoryDto {
  @ApiProperty({ type: [InventoryItemInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryItemInput)
  items: InventoryItemInput[];
}

export class RemoveInventoryQueryDto {
  @ApiProperty({ enum: InventoryProductType })
  @IsEnum(InventoryProductType)
  productType: InventoryProductType;
}

export class ListInventoryQueryDto {
  @ApiPropertyOptional({ enum: InventoryProductType })
  @IsOptional()
  @IsEnum(InventoryProductType)
  productType?: InventoryProductType;
}
