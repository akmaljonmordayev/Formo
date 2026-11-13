import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BroadcastService } from './broadcast.service';
import { BroadcastDto } from './dto/broadcast.dto';

/** Botga ulangan barcha mijozlarga Telegram orqali bir martalik xabar yuborish */
@ApiTags('Admin · Telegram xabar')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat SUPERADMIN' })
@Roles(Role.SUPERADMIN)
@Controller('admin/broadcast')
export class BroadcastController {
  constructor(private readonly broadcast: BroadcastService) {}

  @Get('recipients')
  @ApiOperation({ summary: 'Xabar nechta foydalanuvchiga boradi (botga ulanganlar soni)' })
  @ApiOkResponse()
  recipients() {
    return this.broadcast.recipients();
  }

  @Post()
  @ApiOperation({ summary: "Botga ulangan barcha mijozlarga xabar yuborish" })
  @ApiOkResponse()
  send(@Body() dto: BroadcastDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.broadcast.send(dto.message, user, req.ip);
  }
}
