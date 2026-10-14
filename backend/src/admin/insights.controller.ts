import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RangeQueryDto } from './dto/insights.dto';
import { OrdersService } from './orders.service';

/** Dashboard, Moliya, Hisobotlar, Ishlab chiqarish sahifalari — hammasi Order ustidagi agregatsiya */
@ApiTags('Admin · Statistika')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin')
export class InsightsController {
  constructor(private readonly orders: OrdersService) {}

  @Get('dashboard')
  @ApiOperation({ summary: "Bosh sahifa statistikasi" })
  @ApiOkResponse()
  dashboard(@Query() query: RangeQueryDto) {
    return this.orders.dashboardStats(query.days ?? 30);
  }

  @Get('finance')
  @ApiOperation({ summary: "Moliya: tushum, to'lov usullari, qaytarishlar" })
  @ApiOkResponse()
  finance(@Query() query: RangeQueryDto) {
    return this.orders.financeStats(query.days ?? 30);
  }

  @Get('reports')
  @ApiOperation({ summary: "Hisobotlar: tushum tarkibi, o'rtacha chek" })
  @ApiOkResponse()
  reports(@Query() query: RangeQueryDto) {
    return this.orders.reportsStats(query.days ?? 30);
  }

  @Get('production')
  @ApiOperation({ summary: "Ishlab chiqarish kanban: sex yuki va bosqichlar" })
  @ApiOkResponse()
  production() {
    return this.orders.production();
  }
}
