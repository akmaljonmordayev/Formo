import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ChatService } from './chat.service';
import {
  ChatMessagesQueryDto,
  ContactsQueryDto,
  ListConversationsQueryDto,
  OpenConversationDto,
  SendChatMessageDto,
} from './dto/chat.dto';

/** Yagona chat API — barcha rollar uchun. Ruxsatlar `chat.policy.ts` da, @Roles kerak emas. */
@ApiTags('Chat')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Bu rol juftligi yozisha olmaydi' })
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'Men yoza oladigan kontaktlar (rol/qidiruv bo‘yicha, ko‘pi bilan 20 ta)' })
  contacts(@CurrentUser() user: AuthUser, @Query() query: ContactsQueryDto) {
    return this.chat.contacts(user, query.role, query.q);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Mening suhbatlarim: oxirgi xabar va o‘qilmaganlar soni' })
  conversations(@CurrentUser() user: AuthUser, @Query() query: ListConversationsQueryDto) {
    return this.chat.list(user, query.orderId);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suhbatni topish yoki yaratish (participantId yoki role; ixtiyoriy orderId)' })
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenConversationDto) {
    return this.chat.open(user, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Xabarlar (`?after=id` — yangilari, `?before=id` — eskilari). Qarama-qarshi tomon xabarlari o‘qilgan bo‘ladi' })
  messages(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number, @Query() query: ChatMessagesQueryDto) {
    return this.chat.messages(user, id, query.after, query.before);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Xabar yuborish' })
  send(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number, @Body() dto: SendChatMessageDto) {
    return this.chat.send(user, id, dto.text);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suhbatni o‘qilgan deb belgilash' })
  read(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.chat.read(user, id);
  }

  @Get('unread')
  @ApiOperation({ summary: 'O‘qilmagan xabarlar soni (menyu nishoni)' })
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unread(user);
  }
}
