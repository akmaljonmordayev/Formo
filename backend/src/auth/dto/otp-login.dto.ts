import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { NormalizePhone, UZ_PHONE_MESSAGE, UZ_PHONE_REGEX } from '../../common/utils/phone';

/** Dev-only: SMS yo'q, shuning uchun faqat demo kod (12345) tekshiriladi (parol yo'q). */
export class OtpLoginDto {
  @ApiProperty({ example: '+998901234567', description: 'Har qanday formatda: +998 90 123 45 67' })
  @NormalizePhone()
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: '12345', description: 'Dev-only demo SMS kodi' })
  @IsString()
  @Matches(/^\d{5}$/, { message: '5 xonali kodni kiriting' })
  code: string;
}
