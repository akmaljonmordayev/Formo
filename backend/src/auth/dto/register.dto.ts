import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsEnum,
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

export class RegisterDto {
  @ApiProperty({ example: '+998901234567' })
  @NormalizePhone()
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: "Parol kamida 6 belgidan iborat bo'lishi kerak" })
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: 'Aziz Rahimov' })
  @CleanText()
  @IsString()
  @NoHtml()
  @MinLength(2, { message: 'Ismingizni kiriting' })
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(100)
  age?: number;

  @ApiPropertyOptional({ example: 178, description: 'sm' })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  height?: number;

  @ApiPropertyOptional({ example: 72, description: 'kg' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(250)
  weight?: number;
}
