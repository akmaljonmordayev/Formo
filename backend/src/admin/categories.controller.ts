import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Admin · Kategoriyalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha kategoriyalar (nofaollari ham) va klublar soni' })
  list() {
    return this.categories.list();
  }

  @Post()
  @ApiOperation({ summary: "Kategoriya (liga) qo'shish" })
  @ApiConflictResponse({ description: 'Bunday nom yoki slug band' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.categories.create(dto, user, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Kategoriyani tahrirlash (nomi o‘zgarsa klublardagi league ham yangilanadi)' })
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.categories.update(id, dto, user, req.ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Bo'sh kategoriyani o'chirish" })
  @ApiConflictResponse({ description: 'Kategoriyada klublar bor' })
  remove(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.categories.remove(id, user, req.ip);
  }
}
