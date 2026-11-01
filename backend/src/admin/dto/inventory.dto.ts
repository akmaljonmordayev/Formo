import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InventoryProductType } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class InventoryItemInput {
  @ApiProperty({ enum: InventoryProductType })
  @IsEnum(InventoryProductType)
  productType: InventoryProductType;

  @ApiProperty({ example: 1, description: 'Kit.id — klubning uy/mehmon/uchinchi formasi' })
  @IsInt()
  kitId: number;

  @ApiProperty({ example: 'M' })
  @IsString()
  size: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(0)
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

export class ListInventoryQueryDto {
  @ApiPropertyOptional({ enum: InventoryProductType })
  @IsOptional()
  @IsEnum(InventoryProductType)
  productType?: InventoryProductType;
}
