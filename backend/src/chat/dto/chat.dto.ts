import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CleanText, NoHtml } from '../../common/utils/no-html';

const MAX_INT4 = 2_147_483_647;

export class SendChatMessageDto {
  @ApiProperty({ example: 'Bugun 20 ta forma tayyor bo‘ladi', maxLength: 1000 })
  @CleanText()
  @NoHtml()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}

export class ChatMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Shu id dan keyingi xabarlar (polling). Berilmasa — oxirgi 100 ta' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_INT4)
  after?: number;

  @ApiPropertyOptional({ description: 'Shu id dan oldingi xabarlar (eski tarixni yuklash)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  before?: number;
}

export class OpenConversationDto {
  @ApiPropertyOptional({ description: 'Suhbatdosh foydalanuvchi id (berilmasa `role` ishlatiladi)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  participantId?: number;

  @ApiPropertyOptional({ enum: [Role.OPERATOR, Role.SUPERADMIN], description: 'Yagona OPERATOR/SUPERADMIN akkaunti bilan. USER uchun default — OPERATOR' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'Buyurtmaga bog‘langan suhbat' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  orderId?: number;
}

export class ListConversationsQueryDto {
  @ApiPropertyOptional({ description: 'Faqat shu buyurtma suhbatlari' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  orderId?: number;
}

export class ContactsQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'Ism / sex nomi / telefon bo‘yicha qidiruv' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;
}
