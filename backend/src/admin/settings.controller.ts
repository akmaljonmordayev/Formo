import { Body, Controller, Get, Param, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateSettingDto } from './dto/setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('Admin · Sozlamalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Barcha sozlamalar (kalit → qiymat)" })
  @ApiOkResponse()
  all() {
    return this.settings.all();
  }

  @Put(':key')
  @ApiOperation({ summary: 'Bitta sozlamani saqlash' })
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.settings.update(key, dto.value, user, req.ip);
  }
}
