import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { buildCloudflareList, connectingPeer, isFromCloudflare } from '../common/middleware/cloudflare-only';

const CLOUDFLARE = buildCloudflareList();

/**
 * Proxy zanjirini (Cloudflare → Railway → ilova) tekshirish uchun: server so'rovni qaysi
 * IP dan kelgan deb ko'rayotganini qaytaradi. Rate-limit aynan `ip` qiymatiga tayanadi.
 */
@ApiTags('Admin · Diagnostika')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Faqat SUPERADMIN' })
@Roles(Role.SUPERADMIN)
@Controller('admin/diagnostics')
export class DiagnosticsController {
  @Get('request')
  @ApiOperation({ summary: 'Server ko‘rayotgan klient IP va proxy headerlari' })
  request(@Req() req: Request) {
    const header = (name: string) => req.headers[name] ?? null;
    return {
      ip: req.ip,
      ips: req.ips,
      remoteAddress: req.socket.remoteAddress ?? null,
      trustProxy: req.app.get('trust proxy'),
      // REQUIRE_CLOUDFLARE yoqishdan oldin tekshirish uchun: so'rov Cloudflare orqali keldimi
      connectingPeer: connectingPeer(req),
      viaCloudflare: isFromCloudflare(req, CLOUDFLARE),
      headers: {
        'x-forwarded-for': header('x-forwarded-for'),
        'x-real-ip': header('x-real-ip'),
        'cf-connecting-ip': header('cf-connecting-ip'),
        'x-forwarded-proto': header('x-forwarded-proto'),
      },
    };
  }
}
