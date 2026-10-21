import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CHAT_ALLOWED, canChat, isStaff, orderAccessible } from './chat.policy';

const PAGE = 100;
const CONTACTS_LIMIT = 20;

const userSelect = { id: true, role: true, fullName: true, workshopName: true, phone: true, isActive: true } as const;
type ChatUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

const displayName = (u: Pick<ChatUser, 'role' | 'fullName' | 'workshopName'>) =>
  (u.role === Role.TAILOR && u.workshopName) || u.fullName;

/** Barcha rollar uchun yagona suhbat tizimi: ikki ishtirokchi (+ ixtiyoriy buyurtma), polling `?after=id` */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private counterpart(conv: { userA: ChatUser; userB: ChatUser }, meId: number): ChatUser {
    return conv.userA.id === meId ? conv.userB : conv.userA;
  }

  private publicUser(u: ChatUser, viewer: Role) {
    return {
      id: u.id,
      role: u.role,
      name: displayName(u),
      // telefon faqat xodimlarga ko'rinadi (qo'ng'iroq tugmasi uchun)
      ...(isStaff(viewer) ? { phone: u.phone } : {}),
    };
  }

  /** Suhbatni faqat ishtirokchi ko'ra oladi; begonaga 404 (mavjudligi sezilmasin) */
  private async member(conversationId: number, me: AuthUser) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ userAId: me.id }, { userBId: me.id }] },
      include: { userA: { select: userSelect }, userB: { select: userSelect } },
    });
    if (!conv) throw new NotFoundException('Suhbat topilmadi');
    return conv;
  }

  /** Yoza oladigan kontaktlar (rol va qidiruv bo'yicha) */
  async contacts(me: AuthUser, role?: Role, q?: string) {
    const allowed = CHAT_ALLOWED[me.role];
    if (role && !allowed.includes(role)) return [];
    const term = q?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: me.id },
        isActive: true,
        role: role ? role : { in: [...allowed] },
        ...(term
          ? {
              OR: [
                { fullName: { contains: term, mode: 'insensitive' } },
                { workshopName: { contains: term, mode: 'insensitive' } },
                ...(isStaff(me.role) ? [{ phone: { contains: term } }] : []),
              ],
            }
          : {}),
      },
      select: userSelect,
      orderBy: [{ role: 'asc' }, { id: 'asc' }],
      take: CONTACTS_LIMIT,
    });
    return users.map((u) => this.publicUser(u, me.role));
  }

  private async resolveCounterpart(me: AuthUser, participantId?: number, role?: Role): Promise<ChatUser> {
    let target: ChatUser | null = null;
    if (participantId) {
      target = await this.prisma.user.findUnique({ where: { id: participantId }, select: userSelect });
    } else {
      const wanted = role ?? (me.role === Role.USER ? Role.OPERATOR : undefined);
      if (!wanted) throw new BadRequestException('participantId yoki role ko‘rsating');
      target = await this.prisma.user.findFirst({
        where: { role: wanted, isActive: true },
        orderBy: { id: 'asc' },
        select: userSelect,
      });
    }
    if (!target || target.id === me.id) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (!canChat(me.role, target.role)) throw new ForbiddenException('Bu foydalanuvchiga yozish mumkin emas');
    if (!target.isActive) throw new ForbiddenException('Foydalanuvchi faol emas');
    return target;
  }

  /** Suhbatni topadi yoki yaratadi (juftlik + buyurtma bo'yicha yagona) */
  async open(me: AuthUser, dto: { participantId?: number; role?: Role; orderId?: number }) {
    const other = await this.resolveCounterpart(me, dto.participantId, dto.role);

    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        select: { id: true, customerId: true, workshopId: true },
      });
      if (!order || !orderAccessible(order, { id: me.id, role: me.role }, { id: other.id, role: other.role })) {
        throw new ForbiddenException('Bu buyurtma bo‘yicha suhbat ochib bo‘lmaydi');
      }
    }

    const [userAId, userBId] = me.id < other.id ? [me.id, other.id] : [other.id, me.id];
    const where = { userAId, userBId, orderId: dto.orderId ?? null };
    let conv = await this.prisma.conversation.findFirst({ where });
    if (!conv) {
      try {
        conv = await this.prisma.conversation.create({ data: where });
      } catch (e) {
        // parallel so'rov allaqachon yaratgan (partial unique indeks)
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          conv = await this.prisma.conversation.findFirst({ where });
        } else throw e;
      }
      if (!conv) throw new NotFoundException('Suhbat topilmadi');
    }
    return this.view(conv.id, me);
  }

  private async view(conversationId: number, me: AuthUser) {
    const conv = await this.prisma.conversation.findFirstOrThrow({
      where: { id: conversationId },
      include: {
        userA: { select: userSelect },
        userB: { select: userSelect },
        order: { select: { id: true, code: true, status: true } },
      },
    });
    return {
      id: conv.id,
      counterpart: this.publicUser(this.counterpart(conv, me.id), me.role),
      order: conv.order,
      lastMessage: null,
      unread: 0,
    };
  }

  /** Mening suhbatlarim: oxirgi xabar va o'qilmaganlar soni (oxirgi yozilgani birinchi). Bo'sh suhbatlar ko'rsatilmaydi */
  async list(me: AuthUser, orderId?: number) {
    const convs = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userAId: me.id }, { userBId: me.id }],
        lastMessageAt: { not: null },
        ...(orderId ? { orderId } : {}),
      },
      include: {
        userA: { select: userSelect },
        userB: { select: userSelect },
        order: { select: { id: true, code: true, status: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
    });
    if (!convs.length) return [];
    const ids = convs.map((c) => c.id);

    const [last, unread] = await Promise.all([
      this.prisma.message.groupBy({ by: ['conversationId'], where: { conversationId: { in: ids } }, _max: { id: true } }),
      this.prisma.message.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: ids }, readAt: null, OR: [{ senderId: null }, { senderId: { not: me.id } }] },
        _count: { _all: true },
      }),
    ]);
    const lastIds = last.map((l) => l._max.id).filter((id): id is number => id != null);
    const lastMessages = await this.prisma.message.findMany({ where: { id: { in: lastIds } } });
    const lastBy = new Map(lastMessages.map((m) => [m.conversationId, m]));
    const unreadBy = new Map(unread.map((u) => [u.conversationId, u._count._all]));

    return convs.map((c) => {
      const m = lastBy.get(c.id);
      return {
        id: c.id,
        counterpart: this.publicUser(this.counterpart(c, me.id), me.role),
        order: c.order,
        lastMessage: m ? { text: m.text, mine: m.senderId === me.id, createdAt: m.createdAt } : null,
        unread: unreadBy.get(c.id) ?? 0,
      };
    });
  }

  private async markRead(conversationId: number, meId: number) {
    await this.prisma.message.updateMany({
      where: { conversationId, readAt: null, OR: [{ senderId: null }, { senderId: { not: meId } }] },
      data: { readAt: new Date() },
    });
  }

  /** Xabarlar. Ochilganda qarama-qarshi tomon xabarlari o'qilgan deb belgilanadi */
  async messages(me: AuthUser, conversationId: number, after?: number, before?: number) {
    const conv = await this.member(conversationId, me);
    const base = { conversationId };
    let rows;
    if (after) {
      rows = await this.prisma.message.findMany({ where: { ...base, id: { gt: after } }, orderBy: { id: 'asc' }, take: PAGE });
    } else {
      const desc = await this.prisma.message.findMany({
        where: { ...base, ...(before ? { id: { lt: before } } : {}) },
        orderBy: { id: 'desc' },
        take: PAGE,
      });
      rows = desc.reverse();
    }
    await this.markRead(conversationId, me.id);

    const roleOf = new Map<number, Role>([
      [conv.userA.id, conv.userA.role],
      [conv.userB.id, conv.userB.role],
    ]);
    return {
      items: rows.map((m) => ({
        id: m.id,
        text: m.text,
        mine: m.senderId === me.id,
        senderId: m.senderId,
        senderRole: m.senderId != null ? (roleOf.get(m.senderId) ?? null) : null,
        createdAt: m.createdAt,
        readAt: m.readAt,
      })),
    };
  }

  async send(me: AuthUser, conversationId: number, text: string) {
    const conv = await this.member(conversationId, me);
    const other = this.counterpart(conv, me.id);
    if (!other.isActive) throw new ForbiddenException('Foydalanuvchi faol emas');
    if (!canChat(me.role, other.role)) throw new ForbiddenException('Bu foydalanuvchiga yozish mumkin emas');

    const [m] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { conversationId, senderId: me.id, text: text.trim() } }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    ]);
    return { id: m.id, text: m.text, mine: true, senderId: me.id, senderRole: me.role, createdAt: m.createdAt, readAt: null };
  }

  async read(me: AuthUser, conversationId: number) {
    await this.member(conversationId, me);
    await this.markRead(conversationId, me.id);
    return { ok: true };
  }

  /** Menyudagi nishon uchun: barcha suhbatlar bo'yicha o'qilmagan xabarlar */
  async unread(me: AuthUser) {
    const total = await this.prisma.message.count({
      where: {
        readAt: null,
        OR: [{ senderId: null }, { senderId: { not: me.id } }],
        conversation: { OR: [{ userAId: me.id }, { userBId: me.id }] },
      },
    });
    return { total };
  }
}
