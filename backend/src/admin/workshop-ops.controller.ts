import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ChatService } from './chat.service';
import { DefectsService } from './defects.service';
import { ChatMessagesQueryDto, ListDefectsQueryDto, ResolveDefectDto, SendChatMessageDto } from './dto/workshop-panel.dto';

/** Operator/Superadmin tomoni: tikuv sexlari bilan yozishma */
@ApiTags('Admin · Sex bilan yozishma')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN, Role.OPERATOR)
@Controller('admin/chat')
export class AdminChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  @ApiOperation({ summary: 'Sexlar ro‘yxati: oxirgi xabar va o‘qilmaganlar soni' })
  threads() {
    return this.chat.threads();
  }

  @Get(':workshopId/messages')
  @ApiOperation({ summary: 'Sex bilan yozishma (`?after=id` — faqat yangilari). Sex xabarlari o‘qilgan bo‘ladi' })
  messages(@Param('workshopId', ParseIdPipe) workshopId: number, @Query() query: ChatMessagesQueryDto) {
    return this.chat.messages(workshopId, 'operator', query.after);
  }

  @Post(':workshopId/messages')
  @ApiOperation({ summary: 'Sexga xabar yuborish' })
  send(@Param('workshopId', ParseIdPipe) workshopId: number, @CurrentUser() user: AuthUser, @Body() dto: SendChatMessageDto) {
    return this.chat.send(workshopId, user, dto.text);
  }
}

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
