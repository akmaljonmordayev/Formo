import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateTopUpDto } from './dto/wallet.dto';
import { TopUpsService } from './topups.service';
import { WalletService } from './wallet.service';

@ApiTags('Mobil · Balans')
@ApiBearerAuth()
@Roles(Role.USER)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly topUps: TopUpsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Balans, oxirgi harakatlar va to'ldirish so'rovlari" })
  async summary(@CurrentUser() user: AuthUser) {
    const [wallet, topUps] = await Promise.all([this.wallet.summary(user.id), this.topUps.list(user.id)]);
    return { ...wallet, topUps };
  }

  @Get('topup-methods')
  @ApiOperation({ summary: "To'ldirish usullari (faqat sozlanganlari yoqiq) va chegaralar" })
  methods() {
    return this.topUps.methods();
  }

  @Post('topups')
  @ApiOperation({
    summary: "To'ldirish so'rovi",
    description: "Qo'lda: rekvizitlar va izoh kodi qaytadi, chek Telegram bot orqali yuboriladi. Click/Payme: to'lov sahifasi havolasi.",
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTopUpDto) {
    return this.topUps.create(user.id, dto.amount, dto.method);
  }

  @Post('topups/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.topUps.cancel(user.id, id);
  }
}
