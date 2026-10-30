import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ApproveTopUpDto, RejectTopUpDto, TopUpsQueryDto } from './dto/wallet.dto';
import { TopUpsService } from './topups.service';

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

@ApiTags("Admin · Balans to'ldirish")
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Ruxsat yo'q" })
@Roles(Role.SUPERADMIN)
@Controller('admin/topups')
export class AdminTopUpsController {
  constructor(
    private readonly topUps: TopUpsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: "To'ldirish so'rovlari (holat bo'yicha filtr)" })
  list(@Query() query: TopUpsQueryDto) {
    return this.topUps.adminList(query);
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.topUps.adminGet(id);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: "Chek rasmi (Telegram'dan, serverda saqlanmaydi)" })
  async receipt(@Param('id', ParseIdPipe) id: number, @Res() res: Response) {
    const fileId = await this.topUps.receiptFileId(id);
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new ServiceUnavailableException("Chekni ko'rish uchun serverda TELEGRAM_BOT_TOKEN sozlanmagan");

    const meta = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
      signal: AbortSignal.timeout(10_000),
    })
      .then((r) => r.json() as Promise<{ ok: boolean; result?: { file_path?: string; file_size?: number } }>)
      .catch(() => null);
    const path = meta?.ok ? meta.result?.file_path : undefined;
    if (!path || (meta?.result?.file_size ?? 0) > MAX_RECEIPT_BYTES) {
      throw new ServiceUnavailableException("Chekni Telegram'dan olib bo'lmadi");
    }
    // URL'da token bor — hech qachon logga yoki javobga chiqmaydi
    const file = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (!file?.ok) throw new ServiceUnavailableException("Chekni Telegram'dan olib bo'lmadi");
    const type = file.headers.get('content-type') ?? '';
    const contentType = /^image\/(jpeg|png|webp)$/.test(type) ? type : path.endsWith('.png') ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(await file.arrayBuffer()));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Tasdiqlash — summa balansga bir marta qo'shiladi" })
  approve(@Param('id', ParseIdPipe) id: number, @Body() dto: ApproveTopUpDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.topUps.approve(id, user, req.ip, dto.amount);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id', ParseIdPipe) id: number, @Body() dto: RejectTopUpDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.topUps.reject(id, dto.reason, user, req.ip);
  }
}
