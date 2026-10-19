import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RulesService } from './rules.service';

/** Superadmin sozlamalarining mobil ilova uchun ochiq ko'rinishi (qoidalar, aloqa, ish vaqti, texnik tanaffus) */
@ApiTags('Mobil · Sozlamalar')
@Controller('app')
export class AppConfigController {
  constructor(private readonly rules: RulesService) {}

  @Public()
  @Get('config')
  @ApiOperation({
    summary: 'Ilova sozlamalari',
    description:
      '`rules.acceptOrders=false` bo‘lsa (yoki texnik tanaffus) ilova buyurtmani bloklab `pausedMessage` ni ko‘rsatadi. ' +
      'Savat va rasmiylashtirish shu qoidalarni serverda ham tekshiradi.',
  })
  @ApiOkResponse()
  config() {
    return this.rules.publicConfig();
  }
}
