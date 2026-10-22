import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListInventoryQueryDto, UpsertInventoryDto } from './dto/inventory.dto';
import { RangeQueryDto } from './dto/insights.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ChatService } from './chat.service';
import { DefectsService } from './defects.service';
import {
  ChatMessagesQueryDto,
  CreateDefectDto,
  CreateEmployeeDto,
  ListDefectsQueryDto,
  SendChatMessageDto,
  UpdateEmployeeDto,
  UpdateWorkshopProfileDto,
} from './dto/workshop-panel.dto';
import { InventoryService } from './inventory.service';
import { WorkshopProfileService } from './workshop-profile.service';
import { WorkshopOrdersService } from './workshop-orders.service';

/** Tikuv sexi paneli: ishlab chiqarish taxtasi, statistika va umumiy zaxira (admin route'lariga TAILOR kira olmaydi) */
@ApiTags('Tikuv sexi · Panel')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat TAILOR (tikuv sexi)' })
@Roles(Role.TAILOR)
@Controller('workshop')
export class WorkshopPanelController {
  constructor(
    private readonly orders: WorkshopOrdersService,
    private readonly inventory: InventoryService,
    private readonly chat: ChatService,
    private readonly defects: DefectsService,
    private readonly profile: WorkshopProfileService,
  ) {}

  @Get('production')
  @ApiOperation({ summary: "Sexning ishlab chiqarish taxtasi: ACCEPTED / PRINTING / QUALITY_CHECK / READY ustunlari" })
  @ApiOkResponse()
  production(@CurrentUser() user: AuthUser) {
    return this.orders.production(user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Sex statistikasi: buyurtmalar soni, yuklama, kechikkanlar va kunlik dinamika' })
  stats(@CurrentUser() user: AuthUser, @Query() query: RangeQueryDto) {
    return this.orders.stats(user, query.days ?? 30);
  }

  @Get('inventory')
  @ApiOperation({ summary: "Rang/o'lcham bo'yicha zaxira qoldig'i" })
  listInventory(@Query() query: ListInventoryQueryDto) {
    return this.inventory.list(query);
  }

  @Put('inventory')
  @ApiOperation({ summary: 'Zaxira qoldiqlarini saqlash (bir nechta yozuv birdan)' })
  saveInventory(@Body() dto: UpsertInventoryDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.inventory.upsert(dto, user, req.ip);
  }

  // ── Operator bilan yozishma ────────────────────────────────────────────────
  @Get('chat/messages')
  @ApiOperation({ summary: 'Operator bilan yozishma (`?after=id` — faqat yangilari). Operator xabarlari o‘qilgan bo‘ladi' })
  chatMessages(@CurrentUser() user: AuthUser, @Query() query: ChatMessagesQueryDto) {
    return this.chat.messages(user.id, 'workshop', query.after);
  }

  @Post('chat/messages')
  @ApiOperation({ summary: 'Operatorga xabar yuborish' })
  sendChat(@CurrentUser() user: AuthUser, @Body() dto: SendChatMessageDto) {
    return this.chat.send(user.id, user, dto.text);
  }

  @Get('chat/unread')
  @ApiOperation({ summary: 'Operatordan kelgan o‘qilmagan xabarlar soni' })
  async chatUnread(@CurrentUser() user: AuthUser) {
    return { unread: await this.chat.unreadForWorkshop(user.id) };
  }

  // ── Nuqson (brak) ──────────────────────────────────────────────────────────
  @Get('defects')
  @ApiOperation({ summary: 'Sexning nuqson hisobotlari' })
  listDefects(@CurrentUser() user: AuthUser, @Query() query: ListDefectsQueryDto) {
    return this.defects.listMine(user, query);
  }

  @Post('defects')
  @ApiOperation({ summary: 'Nuqson haqida xabar berish (faqat o‘z buyurtmasi bo‘yicha)' })
  createDefect(@CurrentUser() user: AuthUser, @Body() dto: CreateDefectDto, @Req() req: Request) {
    return this.defects.create(user, dto, req.ip);
  }

  // ── Profil va xodimlar ─────────────────────────────────────────────────────
  @Get('profile')
  @ApiOperation({ summary: 'Sex profili' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.profile.profile(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Sex profilini yangilash (kunlik sig‘imni faqat Superadmin belgilaydi)' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateWorkshopProfileDto, @Req() req: Request) {
    return this.profile.updateProfile(user, dto, req.ip);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Sex xodimlari' })
  listEmployees(@CurrentUser() user: AuthUser) {
    return this.profile.listEmployees(user);
  }

  @Post('employees')
  @ApiOperation({ summary: 'Xodim qo‘shish' })
  createEmployee(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.profile.createEmployee(user, dto);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Xodim ma‘lumotini yangilash' })
  updateEmployee(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.profile.updateEmployee(user, id, dto);
  }

  @Delete('employees/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xodimni o‘chirish' })
  removeEmployee(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.profile.removeEmployee(user, id);
  }
}
