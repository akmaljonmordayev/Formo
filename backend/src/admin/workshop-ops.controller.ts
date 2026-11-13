import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ChatService } from './chat.service';
import { ChatMessagesQueryDto, SendChatMessageDto } from './dto/workshop-panel.dto';

/** Operator/Superadmin tomoni: tikuv sexlari bilan yozishma */
@ApiTags('Admin · Sex bilan yozishma')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
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
