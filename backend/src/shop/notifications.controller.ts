import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CampaignChannel, CampaignStatus, Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Mobil ilovadagi "Bildirishnomalar": Superadmin "Kampaniyalar" bo'limidagi Push xabarlar.
 * Auditoriya: `ORDERED` (buyurtma bergan), `NO_ORDERS` (hali bermagan), `CART` (savati to'la);
 * `ALL` yoki boshqa/erkin matn — hamma mijozga.
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
  async list(@CurrentUser() user: AuthUser) {
    const now = new Date();
    const [orders, cart] = await Promise.all([
      this.prisma.order.count({ where: { customerId: user.id } }),
      this.prisma.cartItem.count({ where: { userId: user.id } }),
    ]);
    const matches: Record<string, boolean> = { ORDERED: orders > 0, NO_ORDERS: orders === 0, CART: cart > 0 };
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
      items: rows
        .filter((c) => matches[c.audience.trim().toUpperCase()] ?? true)
        .map((c) => ({ id: c.id, title: c.name, message: c.message, sentAt: c.scheduledAt ?? c.createdAt })),
    };
  }
}
