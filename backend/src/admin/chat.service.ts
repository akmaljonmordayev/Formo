import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const PAGE = 100;

/** Suhbat tomoni: tikuv sexi (TAILOR) yoki mobil ilova mijozi (USER — qo'llab-quvvatlash chati) */
export type ChatPartyRole = typeof Role.TAILOR | typeof Role.USER;

/**
 * Operator ↔ tomon yozishmasi: har tomon (sex yoki mijoz) uchun bitta suhbat, operator/superadmin tomonida umumiy.
 * `ChatMessage.workshopId` — suhbat egasi (sex yoki mijoz) id'si, `fromWorkshop` — xabar o'sha tomondan kelgan.
 */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertParty(partyId: number, role: ChatPartyRole) {
    const p = await this.prisma.user.findFirst({ where: { id: partyId, role }, select: { id: true, chatHiddenUpTo: true } });
    if (!p) throw new NotFoundException(role === Role.TAILOR ? 'Tikuv sexi topilmadi' : 'Mijoz topilmadi');
    return p;
  }

  /** Operator uchun: suhbatlar, oxirgi xabar va o'qilmaganlar soni (oxirgi yozilgani birinchi) */
  async threads(role: ChatPartyRole = Role.TAILOR) {
    const partyFilter = { workshop: { role } };
    const [last, unread] = await Promise.all([
      this.prisma.chatMessage.groupBy({ by: ['workshopId'], where: partyFilter, _max: { id: true } }),
      this.prisma.chatMessage.groupBy({
        by: ['workshopId'],
        where: { ...partyFilter, fromWorkshop: true, readAt: null },
        _count: { _all: true },
      }),
    ]);
    // Sexlar: barcha faol sexlar (yozishma bo'lmasa ham). Mijozlar: faqat yozganlar.
    const parties = await this.prisma.user.findMany({
      where:
        role === Role.TAILOR
          ? { role, isActive: true }
          : { role, id: { in: last.map((l) => l.workshopId) } },
      select: { id: true, fullName: true, workshopName: true, phone: true, chatHiddenUpTo: true },
    });
    const lastIds = last.map((l) => l._max.id).filter((id): id is number => id != null);
    const lastMessages = await this.prisma.chatMessage.findMany({ where: { id: { in: lastIds } } });
    const lastBy = new Map(lastMessages.map((m) => [m.workshopId, m]));
    const unreadBy = new Map(unread.map((u) => [u.workshopId, u._count._all]));

    const lastIdBy = new Map(last.map((l) => [l.workshopId, l._max.id ?? 0]));
    const isHidden = (p: { id: number; chatHiddenUpTo: number | null }) =>
      p.chatHiddenUpTo != null && (lastIdBy.get(p.id) ?? 0) <= p.chatHiddenUpTo;
    return parties
      // Operator o'zidan o'chirgan mijoz suhbati yangi xabar kelguncha ro'yxatda ko'rinmaydi;
      // sex esa ro'yxatda qoladi (unga yozish uchun), faqat eski yozishmasiz
      .filter((p) => role === Role.TAILOR || !isHidden(p))
      .map((p) => {
        const lm = isHidden(p) ? undefined : lastBy.get(p.id);
        return {
          workshopId: p.id,
          userId: p.id,
          name: (role === Role.TAILOR ? p.workshopName || p.fullName : p.fullName) || p.phone || `#${p.id}`,
          phone: role === Role.USER ? p.phone : undefined,
          unread: unreadBy.get(p.id) ?? 0,
          lastMessage: lm ? { text: lm.text, fromWorkshop: lm.fromWorkshop, createdAt: lm.createdAt } : null,
        };
      })
      .sort((a, b) => (b.lastMessage?.createdAt.getTime() ?? 0) - (a.lastMessage?.createdAt.getTime() ?? 0));
  }

  /**
   * Xabarlar ro'yxati. `viewer` — kim ochyapti: qarama-qarshi tomonning xabarlari o'qilgan deb belgilanadi.
   */
  async messages(partyId: number, viewer: 'operator' | 'workshop', after?: number, role: ChatPartyRole = Role.TAILOR) {
    const party = await this.assertParty(partyId, role);
    // Operator o'chirgan suhbat: yangi xabar kelguncha unga eski yozishma ko'rinmaydi (tomonda esa turaveradi),
    // yangi xabar kelgach butun yozishma qaytadi
    if (viewer === 'operator' && !after && party.chatHiddenUpTo != null) {
      const newer = await this.prisma.chatMessage.count({ where: { workshopId: partyId, id: { gt: party.chatHiddenUpTo } } });
      if (!newer) return { items: [] };
    }
    const where = { workshopId: partyId, ...(after ? { id: { gt: after } } : {}) };
    const items = after
      ? await this.prisma.chatMessage.findMany({ where, orderBy: { id: 'asc' }, take: PAGE })
      : (await this.prisma.chatMessage.findMany({ where, orderBy: { id: 'desc' }, take: PAGE })).reverse();

    // operator ochsa tomondan kelganlar, tomon ochsa operatordan kelganlar o'qilgan bo'ladi
    // (faqat ko'rsatilgan oxirgi xabargacha — shu orada kelgan yangisi o'qilmagan bo'lib qoladi)
    const lastId = items.length ? items[items.length - 1].id : 0;
    if (lastId) {
      await this.prisma.chatMessage.updateMany({
        where: { workshopId: partyId, fromWorkshop: viewer === 'operator', readAt: null, id: { lte: lastId } },
        data: { readAt: new Date() },
      });
    }
    return { items };
  }

  async send(partyId: number, sender: AuthUser, text: string, role: ChatPartyRole = Role.TAILOR) {
    await this.assertParty(partyId, role);
    const fromParty = sender.role === role;
    if (fromParty && sender.id !== partyId) throw new BadRequestException('Faqat o‘z suhbatingizga yoza olasiz');
    if (!fromParty && sender.role !== Role.SUPERADMIN) {
      throw new BadRequestException('Bu suhbatga yozish mumkin emas');
    }
    return this.prisma.chatMessage.create({
      data: { workshopId: partyId, senderId: sender.id, fromWorkshop: fromParty, text: text.trim() },
    });
  }

  /**
   * Operator suhbatni faqat o'zidan o'chiradi: xabarlar bazada qoladi, mijoz ularni ko'raveradi.
   * Mijoz (yoki operator) yangi xabar yozsa suhbat ro'yxatga qaytadi va eski yozishma ham ko'rinadi.
   */
  async hide(partyId: number, role: ChatPartyRole = Role.USER) {
    await this.assertParty(partyId, role);
    const last = await this.prisma.chatMessage.findFirst({ where: { workshopId: partyId }, orderBy: { id: 'desc' }, select: { id: true } });
    if (!last) return { hidden: false };
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: partyId }, data: { chatHiddenUpTo: last.id } }),
      // O'chirilgan suhbatdagi o'qilmaganlar menyudagi nishonda qolib ketmasin
      this.prisma.chatMessage.updateMany({
        where: { workshopId: partyId, fromWorkshop: true, readAt: null, id: { lte: last.id } },
        data: { readAt: new Date() },
      }),
    ]);
    return { hidden: true };
  }

  /** Tomon uchun: operatordan kelgan o'qilmagan xabarlar soni (menyudagi nishon) */
  async unreadForWorkshop(partyId: number) {
    return this.prisma.chatMessage.count({ where: { workshopId: partyId, fromWorkshop: false, readAt: null } });
  }

  /** Operator uchun: mijozlardan kelgan jami o'qilmagan xabarlar (menyudagi nishon) */
  async unreadForOperator(role: ChatPartyRole) {
    return this.prisma.chatMessage.count({ where: { workshop: { role }, fromWorkshop: true, readAt: null } });
  }
}
