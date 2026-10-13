import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import { NormalizePhone, UZ_PHONE_MESSAGE, UZ_PHONE_REGEX } from '../../common/utils/phone';

export class LoginDto {
  @ApiProperty({ example: '+998901111111', description: 'Har qanday formatda: +998 90 111 11 11' })
  @NormalizePhone()
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(1, { message: 'Parolni kiriting' })
  password: string;
}
