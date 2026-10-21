import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

const mk = (id: number, role: Role, extra: object = {}) => ({
  id,
  role,
  fullName: `U${id}`,
  workshopName: null,
  phone: `+998${id}`,
  isActive: true,
  ...extra,
});
const me = (id: number, role: Role): AuthUser => ({ id, role, sessionId: 's' });

describe('ChatService', () => {
  let prisma: {
    user: { findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock };
    order: { findUnique: jest.Mock };
    conversation: { findFirst: jest.Mock; findFirstOrThrow: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    message: { findMany: jest.Mock; groupBy: jest.Mock; create: jest.Mock; updateMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: ChatService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
      order: { findUnique: jest.fn() },
      conversation: { findFirst: jest.fn(), findFirstOrThrow: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      message: { findMany: jest.fn(), groupBy: jest.fn(), create: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    service = new ChatService(prisma as unknown as PrismaService);
  });

  describe('open', () => {
    it('USER ↔ TAILOR taqiqlangan', async () => {
      prisma.user.findUnique.mockResolvedValue(mk(5, Role.TAILOR));
      await expect(service.open(me(9, Role.USER), { participantId: 5 })).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('faol bo‘lmagan foydalanuvchiga ochib bo‘lmaydi', async () => {
      prisma.user.findUnique.mockResolvedValue(mk(2, Role.OPERATOR, { isActive: false }));
      await expect(service.open(me(9, Role.USER), { participantId: 2 })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('USER uchun role berilmasa operator bilan; id lar tartiblanadi (userAId < userBId)', async () => {
      prisma.user.findFirst.mockResolvedValue(mk(2, Role.OPERATOR));
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ id: 1 });
      prisma.conversation.findFirstOrThrow.mockResolvedValue({ id: 1, userA: mk(2, Role.OPERATOR), userB: mk(9, Role.USER), order: null });
      const res = await service.open(me(9, Role.USER), {});
      expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { role: Role.OPERATOR, isActive: true } }));
      expect(prisma.conversation.create).toHaveBeenCalledWith({ data: { userAId: 2, userBId: 9, orderId: null } });
      expect(res.counterpart).toMatchObject({ id: 2, role: Role.OPERATOR });
    });

    it('mavjud suhbat qayta ishlatiladi (yaratilmaydi)', async () => {
      prisma.user.findUnique.mockResolvedValue(mk(2, Role.OPERATOR));
      prisma.conversation.findFirst.mockResolvedValue({ id: 7 });
      prisma.conversation.findFirstOrThrow.mockResolvedValue({ id: 7, userA: mk(2, Role.OPERATOR), userB: mk(9, Role.USER), order: null });
      await service.open(me(9, Role.USER), { participantId: 2 });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('parallel yaratish (P2002) — mavjudini qaytaradi', async () => {
      prisma.user.findUnique.mockResolvedValue(mk(2, Role.OPERATOR));
      prisma.conversation.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 8 });
      prisma.conversation.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
      prisma.conversation.findFirstOrThrow.mockResolvedValue({ id: 8, userA: mk(2, Role.OPERATOR), userB: mk(9, Role.USER), order: null });
      await expect(service.open(me(9, Role.USER), { participantId: 2 })).resolves.toMatchObject({ id: 8 });
    });

    it('buyurtma: begona USER buyurtmasi — 403', async () => {
      prisma.user.findUnique.mockResolvedValue(mk(2, Role.OPERATOR));
      prisma.order.findUnique.mockResolvedValue({ id: 50, customerId: 100, workshopId: null });
      await expect(service.open(me(9, Role.USER), { participantId: 2, orderId: 50 })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('messages / send / read', () => {
    it('ishtirokchi bo‘lmagan 404 oladi', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      await expect(service.messages(me(3, Role.TAILOR), 1)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.send(me(3, Role.TAILOR), 1, 'x')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.read(me(3, Role.TAILOR), 1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('messages: qarama-qarshi tomon xabarlarini o‘qilgan qiladi va mine/senderRole beradi', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 1, userA: mk(2, Role.OPERATOR), userB: mk(9, Role.USER) });
      const now = new Date();
      prisma.message.findMany.mockResolvedValue([
        { id: 2, senderId: 2, text: 'b', readAt: null, createdAt: now },
        { id: 1, senderId: 9, text: 'a', readAt: null, createdAt: now },
      ]);
      const res = await service.messages(me(9, Role.USER), 1);
      expect(res.items.map((m) => [m.id, m.mine, m.senderRole])).toEqual([
        [1, true, Role.USER],
        [2, false, Role.OPERATOR],
      ]);
      expect(prisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { conversationId: 1, readAt: null, OR: [{ senderId: null }, { senderId: { not: 9 } }] } }),
      );
    });

    it('messages ?after: faqat yangilari, o‘sish tartibida', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 1, userA: mk(2, Role.OPERATOR), userB: mk(9, Role.USER) });
      prisma.message.findMany.mockResolvedValue([]);
      await service.messages(me(9, Role.USER), 1, 5);
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { conversationId: 1, id: { gt: 5 } }, orderBy: { id: 'asc' } }),
      );
    });

    it('send: faol bo‘lmagan suhbatdoshga yozib bo‘lmaydi', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 1, userA: mk(2, Role.OPERATOR, { isActive: false }), userB: mk(9, Role.USER) });
      await expect(service.send(me(9, Role.USER), 1, 'salom')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('send: xabar yaratadi va lastMessageAt ni yangilaydi', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 1, userA: mk(2, Role.OPERATOR), userB: mk(9, Role.USER) });
      prisma.message.create.mockResolvedValue({ id: 3, text: 'salom', createdAt: new Date() });
      prisma.conversation.update.mockResolvedValue({});
      const res = await service.send(me(9, Role.USER), 1, ' salom ');
      expect(prisma.message.create).toHaveBeenCalledWith({ data: { conversationId: 1, senderId: 9, text: 'salom' } });
      expect(prisma.conversation.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
      expect(res).toMatchObject({ id: 3, mine: true, senderRole: Role.USER });
    });
  });

  describe('list / unread / contacts', () => {
    it('list: oxirgi xabar va o‘qilmaganlar', async () => {
      const t = new Date();
      prisma.conversation.findMany.mockResolvedValue([
        { id: 1, userA: mk(2, Role.OPERATOR), userB: mk(9, Role.USER), order: null },
      ]);
      prisma.message.groupBy
        .mockResolvedValueOnce([{ conversationId: 1, _max: { id: 4 } }])
        .mockResolvedValueOnce([{ conversationId: 1, _count: { _all: 2 } }]);
      prisma.message.findMany.mockResolvedValue([{ id: 4, conversationId: 1, senderId: 2, text: 'oxirgi', createdAt: t }]);
      const res = await service.list(me(9, Role.USER));
      expect(res).toEqual([
        expect.objectContaining({ id: 1, unread: 2, lastMessage: { text: 'oxirgi', mine: false, createdAt: t } }),
      ]);
    });

    it('list: bo‘sh bo‘lsa bazaga ortiqcha so‘rov yubormaydi', async () => {
      prisma.conversation.findMany.mockResolvedValue([]);
      expect(await service.list(me(9, Role.USER))).toEqual([]);
      expect(prisma.message.groupBy).not.toHaveBeenCalled();
    });

    it('unread: faqat o‘zimniki bo‘lmagan, o‘qilmagan xabarlar', async () => {
      prisma.message.count.mockResolvedValue(3);
      expect(await service.unread(me(9, Role.USER))).toEqual({ total: 3 });
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          readAt: null,
          OR: [{ senderId: null }, { senderId: { not: 9 } }],
          conversation: { OR: [{ userAId: 9 }, { userBId: 9 }] },
        },
      });
    });

    it('contacts: USER TAILOR so‘rasa bo‘sh; telefon faqat xodimga ko‘rinadi', async () => {
      expect(await service.contacts(me(9, Role.USER), Role.TAILOR)).toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      prisma.user.findMany.mockResolvedValue([mk(5, Role.TAILOR, { workshopName: 'Sex 1' })]);
      const staff = await service.contacts(me(1, Role.OPERATOR), Role.TAILOR);
      expect(staff).toEqual([{ id: 5, role: Role.TAILOR, name: 'Sex 1', phone: '+9985' }]);
      prisma.user.findMany.mockResolvedValue([mk(2, Role.OPERATOR)]);
      const usr = await service.contacts(me(9, Role.USER));
      expect(usr[0]).not.toHaveProperty('phone');
    });
  });
});
