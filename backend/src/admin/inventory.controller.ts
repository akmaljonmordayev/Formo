import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListInventoryQueryDto, UpsertInventoryDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Admin · Zaxira')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @ApiOperation({ summary: "Rang/o'lcham bo'yicha zaxira qoldig'i" })
  @ApiOkResponse()
  list(@Query() query: ListInventoryQueryDto) {
    return this.inventory.list(query);
  }

  @Put()
  @ApiOperation({ summary: "Zaxira qoldiqlarini saqlash (bir nechta yozuv birdan)" })
  upsert(@Body() dto: UpsertInventoryDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.inventory.upsert(dto, user, req.ip);
  }
}
