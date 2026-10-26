import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RulesService } from './rules.service';
import { StudioService } from './studio.service';

/** Superadmin sozlamalarining mobil ilova uchun ochiq ko'rinishi (qoidalar, aloqa, ish vaqti, texnik tanaffus) */
@ApiTags('Mobil · Sozlamalar')
@Controller('app')
export class AppConfigController {
  constructor(
    private readonly rules: RulesService,
    private readonly studio: StudioService,
    private readonly env: ConfigService,
  ) {}

  @Public()
  @Get('config')
  @ApiOperation({
    summary: 'Ilova sozlamalari',
    description:
      '`rules.acceptOrders=false` bo‘lsa (yoki texnik tanaffus) ilova buyurtmani bloklab `pausedMessage` ni ko‘rsatadi. ' +
      'Savat va rasmiylashtirish shu qoidalarni serverda ham tekshiradi.',
  })
  @ApiOkResponse()
  async config() {
    const [base, studio] = await Promise.all([this.rules.publicConfig(), this.studio.publicConfig()]);
    // Balansni to'ldirish faqat Telegram bot orqali — ilova botni shu username bilan ochadi
    const telegramBot = (this.env.get<string>('TELEGRAM_BOT_USERNAME') ?? '').replace(/^@/, '').trim() || null;
    return { ...base, studio, telegramBot };
  }
}
