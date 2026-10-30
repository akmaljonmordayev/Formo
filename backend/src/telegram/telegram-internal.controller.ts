import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { TopUpMethod } from '@prisma/client';
import {
  BotCancelTopUpDto,
  BotReceiptDto,
  BotTopUpDto,
  OutboxLeaseQueryDto,
  OutboxReportDto,
  TelegramChatDto,
  TelegramClaimDto,
  TelegramContactDto,
  TelegramLanguageDto,
  TelegramUserDto,
} from './dto/telegram.dto';
import { InternalTokenGuard } from './internal-token.guard';
import { TelegramAccountService } from './telegram-account.service';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramOutboxService } from './telegram-outbox.service';

/**
 * Faqat telegram-bot servisi uchun (JWT emas, `TELEGRAM_INTERNAL_TOKEN`). Swagger'da ko'rsatilmaydi.
 * Bot bu yerdan balans, to'lov yoki buyurtmani o'zgartira olmaydi — faqat kirish va xabarlar.
 */
@ApiExcludeController()
@Public()
@UseGuards(InternalTokenGuard)
@Throttle({ default: { limit: 600, ttl: 60_000 } })
@Controller('internal/telegram')
export class TelegramInternalController {
  constructor(
    private readonly auth: TelegramAuthService,
    private readonly outbox: TelegramOutboxService,
    private readonly account: TelegramAccountService,
  ) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  claim(@Body() dto: TelegramClaimDto) {
    return this.auth.claim(dto.startToken, dto.telegramUserId, dto.chatId, dto.language);
  }

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  contact(@Body() dto: TelegramContactDto) {
    return this.auth.contact(dto.telegramUserId, dto.phone);
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  resend(@Body() dto: TelegramUserDto) {
    return this.auth.resend(dto.telegramUserId);
  }

  @Post('hello')
  @HttpCode(HttpStatus.OK)
  hello(@Body() dto: TelegramChatDto) {
    return this.auth.hello(dto.telegramUserId, dto.chatId);
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stop(@Body() dto: TelegramUserDto) {
    return this.auth.stop(dto.telegramUserId);
  }

  // ---- Hisob, balans, buyurtmalar, to'ldirish (faqat ulangan mijoz) ----

  @Post('me')
  @HttpCode(HttpStatus.OK)
  me(@Body() dto: TelegramUserDto) {
    return this.account.me(dto.telegramUserId);
  }

  @Post('language')
  @HttpCode(HttpStatus.OK)
  language(@Body() dto: TelegramLanguageDto) {
    return this.account.setLanguage(dto.telegramUserId, dto.language);
  }

  @Post('balance')
  @HttpCode(HttpStatus.OK)
  balance(@Body() dto: TelegramUserDto) {
    return this.account.balance(dto.telegramUserId);
  }

  @Post('orders')
  @HttpCode(HttpStatus.OK)
  orders(@Body() dto: TelegramUserDto) {
    return this.account.orders(dto.telegramUserId);
  }

  @Get('topup-methods')
  methods() {
    return this.account.methods();
  }

  @Post('topups')
  @HttpCode(HttpStatus.OK)
  createTopUp(@Body() dto: BotTopUpDto) {
    return this.account.createTopUp(dto.telegramUserId, dto.amount, dto.method as TopUpMethod);
  }

  @Post('topups/receipt')
  @HttpCode(HttpStatus.OK)
  receipt(@Body() dto: BotReceiptDto) {
    return this.account.attachReceipt(dto.telegramUserId, dto.fileId, dto.fileUniqueId);
  }

  @Post('topups/cancel')
  @HttpCode(HttpStatus.OK)
  cancelTopUp(@Body() dto: BotCancelTopUpDto) {
    return this.account.cancelTopUp(dto.telegramUserId, dto.topUpId);
  }

  @Get('support')
  support() {
    return this.account.support();
  }

  @Get('outbox')
  lease(@Query() query: OutboxLeaseQueryDto) {
    return this.outbox.lease(query.limit);
  }

  @Post('outbox/:id/result')
  @HttpCode(HttpStatus.OK)
  report(@Param('id', ParseIdPipe) id: number, @Body() dto: OutboxReportDto) {
    return this.outbox.report(id, dto.result, dto.error);
  }
}
