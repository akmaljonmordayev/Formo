import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';
import { NormalizePhone, UZ_PHONE_MESSAGE, UZ_PHONE_REGEX } from '../../common/utils/phone';

const PASSWORD_MESSAGE = "Parol kamida 6 belgidan iborat bo'lishi kerak";

/** fullName — tikuv sexining mas'ul shaxsi */
export class CreateWorkshopDto {
  @ApiProperty({ example: '+998902222222' })
  @NormalizePhone()
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 'workshop123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: PASSWORD_MESSAGE })
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: 'Dilshod Karimov' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'Ipak Yo‘li Tikuv' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2)
  @MaxLength(120)
  workshopName: string;

  @ApiPropertyOptional({ example: 'Toshkent, Chilonzor 7' })
  @IsOptional()
  @CleanText()
  @IsString()
  @NoHtml()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 40, description: "Kunlik sig'im (dona) — faqat Superadmin belgilaydi" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  dailyCapacity?: number;
}

export class UpdateWorkshopDto extends PartialType(CreateWorkshopDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ListQueryDto {
  @ApiPropertyOptional({ description: "Ism, telefon yoki sex nomi bo'yicha qidiruv" })
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;

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
