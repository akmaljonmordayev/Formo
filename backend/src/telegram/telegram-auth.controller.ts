import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';
import { TelegramStartDto, TelegramStartResponseDto, TelegramVerifyDto } from './dto/telegram.dto';
import { TelegramAuthService } from './telegram-auth.service';

const AUTH_LIMIT = { default: { limit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 10), ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth/telegram')
export class TelegramAuthController {
  constructor(private readonly telegram: TelegramAuthService) {}

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Telegram bot orqali kirish: so‘rov ochish',
    description:
      'Javobdagi `deepLink` Telegram botni ochadi. Foydalanuvchi botda Start bosib, ' +
      'raqamini (kontakt tugmasi) tasdiqlaydi va 5 xonali kod oladi. So‘rov 10 daqiqa amal qiladi. ' +
      'Javob raqam ro‘yxatdan o‘tgan-o‘tmaganiga bog‘liq emas.',
  })
  @ApiOkResponse({ type: TelegramStartResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Bot serverda sozlanmagan' })
  @ApiTooManyRequestsResponse({ description: "Juda ko'p urinish" })
  start(@Body() dto: TelegramStartDto, @Req() req: Request) {
    return this.telegram.start(dto.phone, { userAgent: req.headers['user-agent'], ip: req.ip });
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Telegram bot orqali kirish: kodni tekshirish',
    description:
      'Kod bir martalik, 5 daqiqa amal qiladi, so‘rov uchun 5 ta urinish. Hisob bo‘lmasa ochiladi ' +
      '(`isNewUser: true`) — keyin `PATCH /auth/me` bilan ism, jins va yosh saqlanadi.',
  })
  @ApiOkResponse({ type: AuthResponseDto, description: 'AuthResponse + `isNewUser`, `profileComplete`' })
  @ApiUnauthorizedResponse({ description: "Kod noto'g'ri, muddati o'tgan yoki ishlatilgan" })
  @ApiForbiddenResponse({ description: 'Akkaunt bloklangan / xodim hisobi' })
  verify(@Body() dto: TelegramVerifyDto, @Req() req: Request) {
    return this.telegram.verify(dto.challengeId, dto.code, { userAgent: req.headers['user-agent'], ip: req.ip });
  }
}
