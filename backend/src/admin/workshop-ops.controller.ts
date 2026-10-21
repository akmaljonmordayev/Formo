import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { DefectsService } from './defects.service';
import { ListDefectsQueryDto, ResolveDefectDto } from './dto/workshop-panel.dto';

/** Operator/Superadmin tomoni: sexlar topgan nuqsonlar */
@ApiTags('Admin · Nuqsonlar (brak)')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN, Role.OPERATOR)
@Controller('admin/defects')
export class AdminDefectsController {
  constructor(private readonly defects: DefectsService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha sexlarning nuqson hisobotlari (`openCount` — hal qilinmaganlar)' })
  list(@Query() query: ListDefectsQueryDto) {
    return this.defects.listAll(query);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Nuqsonni hal qilingan deb belgilash' })
  resolve(@Param('id', ParseIdPipe) id: number, @Body() dto: ResolveDefectDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.defects.resolve(id, dto, user, req.ip);
  }
}
