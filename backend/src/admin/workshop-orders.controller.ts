import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { RejectOrderDto, WorkshopOrdersQueryDto, WorkshopStatusDto } from './dto/order.dto';
import { WorkshopOrdersService } from './workshop-orders.service';

/**
 * Tikuv sexi paneli. Oqim:
 * operator yuboradi (`SENT_TO_WORKSHOP`) → sex qabul qiladi (`ACCEPTED`) yoki rad etadi (operatorga `NEW` bo'lib qaytadi) →
 * `PRINTING` → `QUALITY_CHECK` → `READY` → `DELIVERING`. Sex faqat o'ziga biriktirilgan buyurtmalarni ko'radi.
 */
@ApiTags('Tikuv sexi · Buyurtmalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat TAILOR (tikuv sexi)' })
@Roles(Role.TAILOR)
@Controller('workshop/orders')
export class WorkshopOrdersController {
  constructor(private readonly orders: WorkshopOrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Sexga biriktirilgan buyurtmalar',
    description: 'Yangi kelganlar: `?status=SENT_TO_WORKSHOP`. `byStatus` — har holat bo‘yicha soni (tablar uchun).',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: WorkshopOrdersQueryDto) {
    return this.orders.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buyurtma tafsiloti: mahsulotlar, yetkazish manzili va holat tarixi' })
  @ApiNotFoundResponse({ description: 'Buyurtma topilmadi yoki bu sexga tegishli emas' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.orders.get(user, id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buyurtmani tasdiqlash (qabul qilish)', description: '`SENT_TO_WORKSHOP` → `ACCEPTED`' })
  @ApiConflictResponse({ description: 'Buyurtma tasdiq kutmayapti' })
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number, @Req() req: Request) {
    return this.orders.accept(user, id, req.ip);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buyurtmani rad etish',
    description: '`SENT_TO_WORKSHOP` → `NEW`: buyurtma sexdan ajratiladi va operator boshqa sexga yuboradi.',
  })
  @ApiConflictResponse({ description: 'Buyurtma allaqachon qabul qilingan' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: RejectOrderDto,
    @Req() req: Request,
  ) {
    return this.orders.reject(user, id, dto, req.ip);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Ishlab chiqarish holatini yangilash: bosilmoqda / tayyor / yetkazishga berildi',
    description:
      'Holat faqat oldinga o‘zgaradi (oraliq bosqichlarni o‘tkazib yuborish mumkin, masalan `ACCEPTED` → `READY`). ' +
      '`DELIVERING` faqat `READY` dan keyin.',
  })
  @ApiConflictResponse({ description: 'Ruxsat etilmagan o‘tish' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: WorkshopStatusDto,
    @Req() req: Request,
  ) {
    return this.orders.updateStatus(user, id, dto, req.ip);
  }
}
