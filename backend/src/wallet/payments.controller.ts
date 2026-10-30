import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ClickParams, ClickService } from './click.service';
import { PaymeService } from './payme.service';

/**
 * To'lov tizimlari callback'lari. JWT emas: Click — md5 imzo, Payme — Basic auth (kassa kaliti).
 * Kredensiallar berilmagan bo'lsa hamma so'rov xato bilan rad etiladi. Javob har doim HTTP 200 (provayder talabi).
 * Body DTO'siz o'qiladi: provayder qo'shimcha maydon yuborsa global ValidationPipe uni 400 qilmasin.
 */
@ApiExcludeController()
@Public()
@Throttle({ default: { limit: 600, ttl: 60_000 } })
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly click: ClickService,
    private readonly payme: PaymeService,
  ) {}

  @Post('click/prepare')
  @HttpCode(HttpStatus.OK)
  clickPrepare(@Body() body: ClickParams) {
    return this.click.prepare(body ?? {});
  }

  @Post('click/complete')
  @HttpCode(HttpStatus.OK)
  clickComplete(@Body() body: ClickParams) {
    return this.click.complete(body ?? {});
  }

  @Post('payme')
  @HttpCode(HttpStatus.OK)
  paymeRpc(@Headers('authorization') auth: string | undefined, @Body() body: Record<string, unknown>) {
    return this.payme.handle(auth, body);
  }
}
