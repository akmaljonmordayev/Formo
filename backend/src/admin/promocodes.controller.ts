import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreatePromocodeDto, UpdatePromocodeDto } from './dto/promocode.dto';
import { PromocodesService } from './promocodes.service';

@ApiTags('Admin · Promokodlar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/promocodes')
export class PromocodesController {
  constructor(private readonly promocodes: PromocodesService) {}

  @Get()
  @ApiOperation({ summary: "Promokodlar ro'yxati" })
  @ApiOkResponse()
  list() {
    return this.promocodes.list();
  }

  @Post()
  @ApiOperation({ summary: 'Yangi promokod' })
  create(@Body() dto: CreatePromocodeDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.promocodes.create(dto, user, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Promokodni tahrirlash yoki yoqish/o'chirish" })
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdatePromocodeDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.promocodes.update(id, dto, user, req.ip);
  }
}
