import { Body, Controller, Delete, Get, Param, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ListInventoryQueryDto, RemoveInventoryQueryDto, UpsertInventoryDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Admin · Zaxira')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @ApiOperation({ summary: "Klub formasi/o'lcham bo'yicha zaxira qoldig'i" })
  @ApiOkResponse()
  list(@Query() query: ListInventoryQueryDto) {
    return this.inventory.list(query);
  }

  @Get('kits')
  @ApiOperation({ summary: 'Zaxira uchun klub formalari ro‘yxati (tanlov uchun)' })
  kitOptions() {
    return this.inventory.kitOptions();
  }

  @Put()
  @ApiOperation({ summary: "Zaxira qoldiqlarini saqlash (bir nechta yozuv birdan)" })
  upsert(@Body() dto: UpsertInventoryDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.inventory.upsert(dto, user, req.ip);
  }

  @Delete('kit/:kitId')
  @ApiOperation({ summary: "Formaning futbolka yoki shortik qoldig'ini o'chirish (barcha o'lchamlar)" })
  removeKit(
    @Param('kitId', ParseIdPipe) kitId: number,
    @Query() query: RemoveInventoryQueryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.inventory.removeKit(kitId, query.productType, user, req.ip);
  }
}
