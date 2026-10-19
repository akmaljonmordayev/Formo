import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListInventoryQueryDto, UpsertInventoryDto } from './dto/inventory.dto';
import { RangeQueryDto } from './dto/insights.dto';
import { InventoryService } from './inventory.service';
import { WorkshopOrdersService } from './workshop-orders.service';

/** Tikuv sexi paneli: ishlab chiqarish taxtasi, statistika va umumiy zaxira (admin route'lariga TAILOR kira olmaydi) */
@ApiTags('Tikuv sexi · Panel')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat TAILOR (tikuv sexi)' })
@Roles(Role.TAILOR)
@Controller('workshop')
export class WorkshopPanelController {
  constructor(
    private readonly orders: WorkshopOrdersService,
    private readonly inventory: InventoryService,
  ) {}

  @Get('production')
  @ApiOperation({ summary: "Sexning ishlab chiqarish taxtasi: ACCEPTED / PRINTING / QUALITY_CHECK / READY ustunlari" })
  @ApiOkResponse()
  production(@CurrentUser() user: AuthUser) {
    return this.orders.production(user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Sex statistikasi: buyurtmalar soni, yuklama, kechikkanlar va kunlik dinamika' })
  stats(@CurrentUser() user: AuthUser, @Query() query: RangeQueryDto) {
    return this.orders.stats(user, query.days ?? 30);
  }

  @Get('inventory')
  @ApiOperation({ summary: "Rang/o'lcham bo'yicha zaxira qoldig'i" })
  listInventory(@Query() query: ListInventoryQueryDto) {
    return this.inventory.list(query);
  }

  @Put('inventory')
  @ApiOperation({ summary: 'Zaxira qoldiqlarini saqlash (bir nechta yozuv birdan)' })
  saveInventory(@Body() dto: UpsertInventoryDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.inventory.upsert(dto, user, req.ip);
  }
}
