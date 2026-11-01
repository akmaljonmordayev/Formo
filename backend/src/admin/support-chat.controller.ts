import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ChatService } from './chat.service';
import { ChatMessagesQueryDto, SendChatMessageDto } from './dto/workshop-panel.dto';

// Spamga qarshi: daqiqasiga 20 ta xabar
const SEND_LIMIT = { default: { limit: 20, ttl: 60_000 } };

/** Mobil ilova mijozi: qo'llab-quvvatlash (operator) bilan yozishma — faqat o'z suhbati */
@ApiTags('Mobil · Yordam chati')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat mobil ilova foydalanuvchisi' })
@Roles(Role.USER)
@Controller('support')
export class SupportChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('messages')
  @ApiOperation({ summary: 'Operator bilan yozishma (`?after=id` — faqat yangilari). Operator xabarlari o‘qilgan bo‘ladi' })
  messages(@CurrentUser() user: AuthUser, @Query() query: ChatMessagesQueryDto) {
    return this.chat.messages(user.id, 'workshop', query.after, Role.USER);
  }

  @Post('messages')
  @Throttle(SEND_LIMIT)
  @ApiOperation({ summary: 'Operatorga xabar yuborish' })
  send(@CurrentUser() user: AuthUser, @Body() dto: SendChatMessageDto) {
    return this.chat.send(user.id, user, dto.text, Role.USER);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Operatordan kelgan o‘qilmagan xabarlar soni' })
  async unread(@CurrentUser() user: AuthUser) {
    return { unread: await this.chat.unreadForWorkshop(user.id) };
  }
}

/** Operator/Superadmin tomoni: mijozlar bilan qo'llab-quvvatlash yozishmasi */
@ApiTags('Admin · Mijozlar bilan yozishma')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN, Role.OPERATOR)
@Controller('admin/support')
export class AdminSupportChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  @ApiOperation({ summary: 'Yozgan mijozlar: oxirgi xabar va o‘qilmaganlar soni' })
  threads() {
    return this.chat.threads(Role.USER);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Mijozlardan kelgan jami o‘qilmagan xabarlar' })
  async unread() {
    return { unread: await this.chat.unreadForOperator(Role.USER) };
  }

  @Get(':userId/messages')
  @ApiOperation({ summary: 'Mijoz bilan yozishma (`?after=id` — faqat yangilari)' })
  messages(@Param('userId', ParseIdPipe) userId: number, @Query() query: ChatMessagesQueryDto) {
    return this.chat.messages(userId, 'operator', query.after, Role.USER);
  }

  @Post(':userId/messages')
  @ApiOperation({ summary: 'Mijozga javob yozish' })
  send(@Param('userId', ParseIdPipe) userId: number, @CurrentUser() user: AuthUser, @Body() dto: SendChatMessageDto) {
    return this.chat.send(userId, user, dto.text, Role.USER);
  }
}
