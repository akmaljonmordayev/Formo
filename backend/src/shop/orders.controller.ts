import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { DeliveryService } from './delivery.service';
import { ChangePaymentMethodDto, CheckoutDto, DeliverySlotsQueryDto, MyOrdersQueryDto } from './dto/checkout.dto';
import { ShopOrdersService } from './orders.service';

@ApiTags('Mobil · Rasmiylashtirish va buyurtmalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat mobil ilova foydalanuvchisi' })
@Roles(Role.USER)
@Controller()
export class ShopOrdersController {
  constructor(
    private readonly orders: ShopOrdersService,
    private readonly delivery: DeliveryService,
  ) {}

  @Get('checkout/delivery-slots')
  @ApiOperation({
    summary: 'Yetkazish vaqtlari ("Ertaga 10:00–14:00", "Juma 10:00–14:00" ...)',
    description: 'Ertadan boshlab `days` kun; har slotda qolgan joy soni. Slotlar admin sozlamasidagi `delivery.slots` dan olinadi.',
  })
  async deliverySlots(@Query() query: DeliverySlotsQueryDto) {
    await this.orders.expireStale();
    return { fee: await this.delivery.fee(), days: await this.delivery.slots(query.days) };
  }

  @Post('orders/checkout')
  @ApiOperation({
    summary: 'Savatdan buyurtma berish ("To‘lash")',
    description:
      'Narxlar serverda qayta hisoblanadi. CLICK/PAYME — buyurtma `PENDING_PAYMENT` holatida 30 daqiqa band turadi; ' +
      'CASH — darhol `NEW` (operatorga tushadi). Muvaffaqiyatli bo‘lsa savat tozalanadi.',
  })
  @ApiBadRequestResponse({ description: 'Savat bo‘sh, mahsulot sotuvda emas, promokod yoki sana noto‘g‘ri' })
  @ApiConflictResponse({ description: 'Tanlangan vaqt band yoki promokod limiti tugadi' })
  @ApiNotFoundResponse({ description: 'Manzil topilmadi' })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.orders.checkout(user, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Buyurtmalarim' })
  list(@CurrentUser() user: AuthUser, @Query() query: MyOrdersQueryDto) {
    return this.orders.list(user.id, query);
  }

  @Get('orders/active')
  @ApiOperation({ summary: 'Joriy (yakunlanmagan) oxirgi buyurtma — bosh sahifadagi "Kuzatish" kartasi' })
  active(@CurrentUser() user: AuthUser) {
    return this.orders.active(user.id);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Buyurtma tafsiloti va kuzatish (timeline)' })
  @ApiNotFoundResponse({ description: 'Buyurtma topilmadi' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.orders.get(user.id, id);
  }

  @Post('orders/:id/payment/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'To‘lovni tasdiqlash (demo)',
    description:
      'Click/Payme integratsiyasi ulanguncha dizayndagi "To‘lovni tasdiqlash (demo)" tugmasi uchun. ' +
      'Productionda faqat `PAYMENT_DEMO=true` bo‘lsa ishlaydi.',
  })
  @ApiConflictResponse({ description: 'Buyurtma to‘lov kutmayapti yoki muddati tugagan' })
  confirmPayment(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.orders.confirmPayment(user, id);
  }

  @Patch('orders/:id/payment-method')
  @ApiOperation({ summary: '"Boshqa usulni tanlash" — to‘lanmagan buyurtmaning to‘lov usulini almashtirish' })
  @ApiConflictResponse({ description: 'Buyurtma to‘lov kutmayapti' })
  changePaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ChangePaymentMethodDto,
  ) {
    return this.orders.changePaymentMethod(user, id, dto);
  }

  @Post('orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buyurtmani bekor qilish (bosishga berilmaguncha)' })
  @ApiConflictResponse({ description: 'Buyurtma allaqachon bosishga berilgan' })
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.orders.cancel(user, id);
  }
}
