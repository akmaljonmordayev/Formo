import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { NormalizePhone, UZ_PHONE_MESSAGE, UZ_PHONE_REGEX } from '../../common/utils/phone';

// Telegram ID'lari musbat butun son; guruh chat ID manfiy bo'lishi mumkin (bot faqat shaxsiy chatda ishlaydi)
const TG_ID = /^\d{1,20}$/;
const TG_CHAT_ID = /^-?\d{1,20}$/;

// ---- Mobil ilova (ochiq) ----

export class TelegramStartDto {
  @ApiProperty({ example: '+998901234567' })
  @NormalizePhone()
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;
}

export class TelegramVerifyDto {
  @ApiProperty({ description: '`POST /auth/telegram/start` javobidagi challengeId' })
  @IsUUID('4', { message: "So'rov identifikatori noto'g'ri" })
  challengeId: string;

  @ApiProperty({ example: '48213', description: 'Botda berilgan 5 xonali kod' })
  @IsString()
  @Matches(/^\d{5}$/, { message: '5 xonali kodni kiriting' })
  code: string;
}

export class TelegramStartResponseDto {
  @ApiProperty() challengeId: string;
  @ApiProperty({ example: 'formo_bot' }) botUsername: string;
  @ApiProperty({ example: 'https://t.me/formo_bot?start=...' }) deepLink: string;
  @ApiProperty() expiresAt: Date;
}

// ---- Bot → backend (ichki) ----

export class TelegramUserDto {
  @Matches(TG_ID) telegramUserId: string;
}

export class TelegramChatDto extends TelegramUserDto {
  @Matches(TG_CHAT_ID) chatId: string;
}

export class TelegramClaimDto extends TelegramChatDto {
  // /start payload: base64url, Telegram cheklovi 64 belgi
  @Matches(/^[A-Za-z0-9_-]{20,64}$/) startToken: string;
}

export class TelegramContactDto extends TelegramChatDto {
  // Bot kontakt.user_id === from.id ekanini tekshirgan; raqam bu yerda normallashtiriladi
  @IsString()
  @MaxLength(32)
  phone: string;
}

export class BotTopUpDto extends TelegramUserDto {
  @Type(() => Number)
  @IsInt()
  amount: number;

  @IsIn(['MANUAL_CARD', 'CLICK', 'PAYME'])
  method: 'MANUAL_CARD' | 'CLICK' | 'PAYME';
}

export class BotReceiptDto extends TelegramUserDto {
  // Telegram file_id: harf, raqam, _ va - dan iborat
  @Matches(/^[A-Za-z0-9_-]{10,200}$/) fileId: string;
  // Telegram file_unique_id — bir xil rasmni qayta yuborishni aniqlash uchun (eski bot yubormasa ham ishlaydi)
  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{6,100}$/)
  fileUniqueId?: string;
}

export class BotCancelTopUpDto extends TelegramUserDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topUpId: number;
}

export class OutboxLeaseQueryDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export const OUTBOX_RESULTS = ['SENT', 'RETRY', 'BLOCKED', 'FAILED'] as const;
export type OutboxResult = (typeof OUTBOX_RESULTS)[number];

export class OutboxReportDto {
  @IsIn(OUTBOX_RESULTS) result: OutboxResult;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  error?: string;
}

export class TelegramLanguageDto extends TelegramUserDto {
  @IsIn(['uz', 'ru', 'en']) language: 'uz' | 'ru' | 'en';
}
