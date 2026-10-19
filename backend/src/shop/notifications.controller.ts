import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CampaignChannel, CampaignStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Mobil ilovadagi "Bildirishnomalar": Superadmin "Kampaniyalar" bo'limidagi Push xabarlar.
 * Auditoriya erkin matn bo'lgani uchun xabarlar barcha mijozlarga ko'rinadi.
 */
@ApiTags('Mobil · Bildirishnomalar')
@ApiBearerAuth()
@Roles(Role.USER)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Yuborilgan kampaniya xabarlari (yangilari birinchi)',
    description: 'Faqat Push yoki Push+SMS kanalli, yuborilgan (`ACTIVE`/`COMPLETED`) yoki vaqti kelgan (`SCHEDULED`) kampaniyalar.',
  })
  @ApiOkResponse()
  async list() {
    const now = new Date();
    const rows = await this.prisma.campaign.findMany({
      where: {
        channel: { in: [CampaignChannel.PUSH, CampaignChannel.PUSH_SMS] },
        OR: [
          { status: { in: [CampaignStatus.ACTIVE, CampaignStatus.COMPLETED] } },
          { status: CampaignStatus.SCHEDULED, scheduledAt: { lte: now } },
        ],
      },
      orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });
    return {
      items: rows.map((c) => ({ id: c.id, title: c.name, message: c.message, sentAt: c.scheduledAt ?? c.createdAt })),
    };
  }
}
