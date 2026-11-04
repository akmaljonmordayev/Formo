import { Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CatalogService } from './catalog.service';
import { BestSellingKitsQueryDto, Kit360FilterDto, ListCatalogClubsQueryDto, PopularClubsQueryDto } from './dto/catalog.dto';

@ApiTags('Mobil · Katalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Kategoriyalar (ligalar) — katalogdagi filtr chiplari' })
  @ApiOkResponse({ description: '[{ id, name, slug, clubsCount }] — kit360=true: faqat Forma 360° klubi bor ligalar' })
  categories(@Query() query: Kit360FilterDto) {
    return this.catalog.categories(query.kit360);
  }

  @Public()
  @Get('clubs')
  @ApiOperation({ summary: 'Klublar ro‘yxati: kategoriya bo‘yicha filtr va nom bo‘yicha qidiruv' })
  @ApiOkResponse({ description: '{ items: [{ id, name, league, season, code, markColor, kit360Id, category, kitsCount }], total, page, limit } — kit360Id: Forma 360° suratlari (es|ar|fr|en|pt|uz|rm|fcb|mu|psg|mci|lfc|ars|che) yoki null' })
  clubs(@Query() query: ListCatalogClubsQueryDto) {
    return this.catalog.clubs(query);
  }

  @Public()
  @Get('clubs/popular')
  @ApiOperation({ summary: 'Mashhur klublar (eng ko‘p buyurtma qilinganlar)' })
  popular(@Query() query: PopularClubsQueryDto) {
    return this.catalog.popular(query.limit, query.kit360);
  }

  @Public()
  @Get('clubs/:id')
  @ApiOperation({ summary: 'Klub sahifasi: unga biriktirilgan formalar (Uy / Mehmon / Uchinchi) narxi bilan' })
  @ApiNotFoundResponse({ description: 'Klub topilmadi' })
  club(@Param('id', ParseIdPipe) id: number) {
    return this.catalog.club(id);
  }

  // kits/:id dan oldin — aks holda "best-selling" id sifatida o'qiladi
  @Public()
  @Get('kits/best-selling')
  @ApiOperation({
    summary: 'Eng ko‘p sotilgan formalar',
    description: 'Buyurtmalardagi sotilgan soni bo‘yicha (bekor qilingan/qaytarilgan/to‘lanmaganlar sanalmaydi). kit360=true — har klubdan bitta forma.',
  })
  @ApiOkResponse({ description: '[{ id, clubId, label, title, price, priceBreakdown, sizes, club: { id, name, code, kit360Id, category }, soldCount }]' })
  bestSelling(@Query() query: BestSellingKitsQueryDto) {
    return this.catalog.bestSellingKits(query.limit, query.kit360);
  }

  @Public()
  @Get('kits/:id')
  @ApiOperation({
    summary: 'Forma tafsiloti',
    description: 'Narx tarkibi (futbolka, shortik, ism + raqam bosmasi), o‘lchamlar mavjudligi va klubning boshqa formalari.',
  })
  @ApiNotFoundResponse({ description: 'Forma topilmadi' })
  kit(@Param('id', ParseIdPipe) id: number) {
    return this.catalog.kit(id);
  }

  @ApiBearerAuth()
  @Roles(Role.USER)
  @ApiForbiddenResponse({ description: 'Faqat mobil ilova foydalanuvchisi' })
  @Get('favorites')
  @ApiOperation({ summary: 'Sevimli klublarim' })
  favorites(@CurrentUser() user: AuthUser) {
    return this.catalog.favorites(user.id);
  }

  @ApiBearerAuth()
  @Roles(Role.USER)
  @Put('clubs/:id/favorite')
  @ApiOperation({ summary: 'Klubni sevimlilarga qo‘shish (★)' })
  addFavorite(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.catalog.addFavorite(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(Role.USER)
  @Delete('clubs/:id/favorite')
  @ApiOperation({ summary: 'Klubni sevimlilardan olib tashlash' })
  removeFavorite(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.catalog.removeFavorite(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(Role.USER)
  @ApiForbiddenResponse({ description: 'Faqat mobil ilova foydalanuvchisi' })
  @Get('favorite-kits')
  @ApiOperation({ summary: 'Yoqtirgan formalarim (yurakcha)' })
  favoriteKits(@CurrentUser() user: AuthUser) {
    return this.catalog.favoriteKits(user.id);
  }

  @ApiBearerAuth()
  @Roles(Role.USER)
  @Put('kits/:id/favorite')
  @ApiOperation({ summary: 'Formani yoqtirganlarga qo‘shish (♥)' })
  @ApiNotFoundResponse({ description: 'Forma topilmadi' })
  addFavoriteKit(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.catalog.addFavoriteKit(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(Role.USER)
  @Delete('kits/:id/favorite')
  @ApiOperation({ summary: 'Formani yoqtirganlardan olib tashlash' })
  removeFavoriteKit(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.catalog.removeFavoriteKit(user.id, id);
  }
}
