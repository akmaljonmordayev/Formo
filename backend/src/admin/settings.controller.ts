import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { NotifyService } from '../notify/notify.service';
import { UpdateSettingDto } from './dto/setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('Admin · Sozlamalar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly notify: NotifyService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Barcha sozlamalar (kalit → qiymat)" })
  @ApiOkResponse()
  all() {
    return this.settings.all();
  }

  @Get('notifications/status')
  @ApiOperation({ summary: 'Telegram bildirishnomalari serverda sozlanganmi (`TELEGRAM_BOT_TOKEN`)' })
  notificationsStatus() {
    return { telegramConfigured: this.notify.configured };
  }

  @Post('notifications/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram\'ga sinov xabari yuborish' })
  notificationsTest() {
    return this.notify.test();
  }

  @Put(':key')
  @ApiOperation({ summary: 'Bitta sozlamani saqlash' })
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.settings.update(key, dto.value, user, req.ip);
  }
}
