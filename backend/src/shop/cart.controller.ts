import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CartService } from './cart.service';
import { AddCartItemDto, ApplyPromocodeDto, CartQueryDto, UpdateCartItemDto } from './dto/cart.dto';

@ApiTags('Savat')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat mobil ilova foydalanuvchisi' })
@Roles(Role.USER)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Savat: mahsulotlar va yakun (mahsulotlar, chegirma, yetkazish, jami)',
    description: '`promocode` berilsa chegirma hisoblanadi; promokod yaroqsiz bo‘lsa 400.',
  })
  @ApiBadRequestResponse({ description: 'Promokod yaroqsiz' })
  view(@CurrentUser() user: AuthUser, @Query() query: CartQueryDto) {
    return this.cart.view(user.id, query.promocode);
  }

  @Post('items')
  @ApiOperation({
    summary: 'Formani savatga qo‘shish (konstruktordan)',
    description: 'Aynan shu sozlamadagi forma savatda bo‘lsa yangi qator ochilmaydi — soni oshadi. Javob — butun savat.',
  })
  @ApiNotFoundResponse({ description: 'Forma topilmadi' })
  @ApiBadRequestResponse({ description: 'O‘lcham mavjud emas yoki savat to‘lgan' })
  add(@CurrentUser() user: AuthUser, @Body() dto: AddCartItemDto) {
    return this.cart.add(user.id, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Savat qatorini o‘zgartirish (soni −/+, o‘lcham, ism/raqam)' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number, @Body() dto: UpdateCartItemDto) {
    return this.cart.update(user.id, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Savatdan olib tashlash' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.cart.remove(user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Savatni tozalash' })
  clear(@CurrentUser() user: AuthUser) {
    return this.cart.clear(user.id);
  }

  @Post('promocode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Promokodni tekshirish ("Qo‘llash") — chegirma bilan savatni qaytaradi' })
  @ApiBadRequestResponse({ description: 'Promokod topilmadi, muddati tugagan, limit tugagan yoki minimal summaga yetmagan' })
  applyPromocode(@CurrentUser() user: AuthUser, @Body() dto: ApplyPromocodeDto) {
    return this.cart.view(user.id, dto.code);
  }
}
