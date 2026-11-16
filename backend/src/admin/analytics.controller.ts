import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RangeQueryDto } from './dto/insights.dto';
import { OrdersService } from './orders.service';

/** Sotuv analitikasi — superadmin paneli va tikuv sexi paneli bitta shu API'dan foydalanadi */
@ApiTags('Analitika')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat SUPERADMIN yoki TAILOR' })
@Roles(Role.SUPERADMIN, Role.TAILOR)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly orders: OrdersService) {}

  @Get('kit-sales')
  @ApiOperation({
    summary: "Qaysi forma nechta va qaysi o'lchamda sotilgan",
    description:
      "Davr: `days` (1/7/30/90), `from`+`to` (YYYY-MM-DD) yoki `all`. Bekor qilingan va to'lanmagan buyurtmalar kirmaydi. " +
      "Superadmin — barcha buyurtmalar va summa bilan; tikuv sexi — faqat o'ziga biriktirilgan buyurtmalar, summasiz (`revenue: null`).",
  })
  @ApiOkResponse({
    schema: {
      example: {
        from: '2026-11-01',
        to: '2026-11-16',
        totalQuantity: 148,
        totalRevenue: 23532000,
        kits: [{ name: 'Real Madrid · Uy formasi', type: 'CLUB_KIT', quantity: 31, revenue: 4929000, sizes: { M: 12, L: 10, XL: 9 } }],
        sizes: [{ size: 'M', quantity: 52 }, { size: 'L', quantity: 44 }],
      },
    },
  })
  kitSales(@Query() query: RangeQueryDto, @CurrentUser() user: AuthUser) {
    return this.orders.kitSales(query, user);
  }
}
