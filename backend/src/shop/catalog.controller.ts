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
import { ListCatalogClubsQueryDto, PopularClubsQueryDto } from './dto/catalog.dto';

@ApiTags('Mobil · Katalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Kategoriyalar (ligalar) — katalogdagi filtr chiplari' })
  @ApiOkResponse({ description: '[{ id, name, slug, clubsCount }]' })
  categories() {
    return this.catalog.categories();
  }

  @Public()
  @Get('clubs')
  @ApiOperation({ summary: 'Klublar ro‘yxati: kategoriya bo‘yicha filtr va nom bo‘yicha qidiruv' })
  @ApiOkResponse({ description: '{ items: [{ id, name, league, season, code, markColor, kit360Id, category, kitsCount }], total, page, limit } — kit360Id: Forma 360° suratlari (es|ar|fr|en|pt|rm|fcb|mu|psg|mci) yoki null' })
  clubs(@Query() query: ListCatalogClubsQueryDto) {
    return this.catalog.clubs(query);
  }

  @Public()
  @Get('clubs/popular')
  @ApiOperation({ summary: 'Mashhur klublar (eng ko‘p buyurtma qilinganlar)' })
  popular(@Query() query: PopularClubsQueryDto) {
    return this.catalog.popular(query.limit);
  }

  @Public()
  @Get('clubs/:id')
  @ApiOperation({ summary: 'Klub sahifasi: unga biriktirilgan formalar (Uy / Mehmon / Uchinchi) narxi bilan' })
  @ApiNotFoundResponse({ description: 'Klub topilmadi' })
  club(@Param('id', ParseIdPipe) id: number) {
    return this.catalog.club(id);
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
}
