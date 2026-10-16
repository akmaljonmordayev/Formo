import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { AssignWorkshopDto, ListOrdersQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Admin · Buyurtmalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN, Role.OPERATOR)
@Controller('admin/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: "Buyurtmalar ro'yxati, status bo'yicha filtr",
    description: 'Mobil ilovadan kelgan, tekshirilishi kerak bo‘lgan buyurtmalar: `?status=NEW`.',
  })
  @ApiOkResponse()
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buyurtma tafsiloti: mahsulotlar, sex va holat tarixi (`statusLogs`)' })
  @ApiNotFoundResponse({ description: 'Buyurtma topilmadi' })
  get(@Param('id', ParseIdPipe) id: number) {
    return this.orders.get(id);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tekshirilgan buyurtmani tikuv sexiga yuborish',
    description:
      '`NEW` → `SENT_TO_WORKSHOP`. Sex hali tasdiqlamagan bo‘lsa (`SENT_TO_WORKSHOP`) boshqa sexga qayta yuborish mumkin. ' +
      'Sex `POST /workshop/orders/{id}/accept` bilan tasdiqlaydi.',
  })
  @ApiBadRequestResponse({ description: 'Tikuv sexi topilmadi yoki bloklangan' })
  @ApiConflictResponse({ description: 'Buyurtma to‘lanmagan yoki sex allaqachon qabul qilgan' })
  @ApiNotFoundResponse({ description: 'Buyurtma topilmadi' })
  assign(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: AssignWorkshopDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.orders.assign(id, dto, user, req.ip);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: "Buyurtma holatini qo'lda o'zgartirish",
    description: 'Istalgan holatga (masalan `DELIVERED`, `CANCELLED`, `RETURNED`). O‘zgarish holat tarixiga yoziladi.',
  })
  updateStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.orders.updateStatus(id, dto, user, req.ip);
  }
}
