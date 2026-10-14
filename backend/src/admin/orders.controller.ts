import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ListOrdersQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Admin · Buyurtmalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN, Role.OPERATOR)
@Controller('admin/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "Buyurtmalar ro'yxati, status bo'yicha filtr" })
  @ApiOkResponse()
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.list(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: "Buyurtma holatini o'zgartirish" })
  updateStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.orders.updateStatus(id, dto, user, req.ip);
  }
}
