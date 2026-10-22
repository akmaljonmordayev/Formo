import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const PAGE = 100;

/** Operator ↔ tikuv sexi yozishmasi: har sex uchun bitta suhbat (operator/superadmin tomonida umumiy) */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertWorkshop(workshopId: number) {
    const w = await this.prisma.user.findFirst({ where: { id: workshopId, role: Role.TAILOR }, select: { id: true } });
    if (!w) throw new NotFoundException('Tikuv sexi topilmadi');
  }

  /** Operator uchun: faol sexlar, oxirgi xabar va o'qilmagan xabarlar soni (oxirgi yozilgani birinchi) */
  async threads() {
    const [workshops, last, unread] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: Role.TAILOR, isActive: true },
        select: { id: true, fullName: true, workshopName: true },
      }),
      this.prisma.chatMessage.groupBy({ by: ['workshopId'], _max: { id: true } }),
      this.prisma.chatMessage.groupBy({
        by: ['workshopId'],
        where: { fromWorkshop: true, readAt: null },
        _count: { _all: true },
      }),
    ]);
    const lastIds = last.map((l) => l._max.id).filter((id): id is number => id != null);
    const lastMessages = await this.prisma.chatMessage.findMany({ where: { id: { in: lastIds } } });
    const lastBy = new Map(lastMessages.map((m) => [m.workshopId, m]));
    const unreadBy = new Map(unread.map((u) => [u.workshopId, u._count._all]));

    return workshops
      .map((w) => ({
        workshopId: w.id,
        name: w.workshopName || w.fullName,
        unread: unreadBy.get(w.id) ?? 0,
        lastMessage: lastBy.get(w.id)
          ? { text: lastBy.get(w.id)!.text, fromWorkshop: lastBy.get(w.id)!.fromWorkshop, createdAt: lastBy.get(w.id)!.createdAt }
          : null,
      }))
      .sort((a, b) => (b.lastMessage?.createdAt.getTime() ?? 0) - (a.lastMessage?.createdAt.getTime() ?? 0));
  }

  /**
   * Xabarlar ro'yxati. `viewer` — kim ochyapti: qarama-qarshi tomonning xabarlari o'qilgan deb belgilanadi.
   */
  async messages(workshopId: number, viewer: 'operator' | 'workshop', after?: number) {
    await this.assertWorkshop(workshopId);
    const where = { workshopId, ...(after ? { id: { gt: after } } : {}) };
    const items = after
      ? await this.prisma.chatMessage.findMany({ where, orderBy: { id: 'asc' }, take: PAGE })
      : (await this.prisma.chatMessage.findMany({ where, orderBy: { id: 'desc' }, take: PAGE })).reverse();

    // operator ochsa sexdan kelganlar, sex ochsa operatordan kelganlar o'qilgan bo'ladi
    await this.prisma.chatMessage.updateMany({
      where: { workshopId, fromWorkshop: viewer === 'operator', readAt: null },
      data: { readAt: new Date() },
    });
    return { items };
  }

  async send(workshopId: number, sender: AuthUser, text: string) {
    await this.assertWorkshop(workshopId);
    const fromWorkshop = sender.role === Role.TAILOR;
    if (fromWorkshop && sender.id !== workshopId) throw new BadRequestException('Faqat o‘z suhbatingizga yoza olasiz');
    return this.prisma.chatMessage.create({ data: { workshopId, senderId: sender.id, fromWorkshop, text: text.trim() } });
  }

  /** Sex uchun: operatordan kelgan o'qilmagan xabarlar soni (menyudagi nishon) */
  async unreadForWorkshop(workshopId: number) {
    return this.prisma.chatMessage.count({ where: { workshopId, fromWorkshop: false, readAt: null } });
  }
}
