import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/** Railway healthcheck: yangi deploy shu endpoint 200 qaytargandan keyingina trafik oladi */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Server va baza holati' })
  @ApiOkResponse({ schema: { example: { status: 'ok', uptime: 12.3 } } })
  @ApiServiceUnavailableResponse({ description: 'Bazaga ulanib bo‘lmadi' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Bazaga ulanib bo‘lmadi');
    }
    return { status: 'ok', uptime: Math.round(process.uptime() * 10) / 10 };
  }
}
