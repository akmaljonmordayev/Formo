import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

const as = (id: number, role: Role) => ({ id, role }) as AuthUser;

describe('ChatService (support chat: mijoz ↔ operator)', () => {
  const prisma = {
    user: { findFirst: jest.fn(), findMany: jest.fn() },
    chatMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  };
  const service = new ChatService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.chatMessage.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));
    prisma.chatMessage.findMany.mockResolvedValue([]);
  });

  it('mijoz o‘z suhbatiga yozadi — fromWorkshop=true', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 7 });
    const msg = await service.send(7, as(7, Role.USER), '  Salom ', Role.USER);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 7, role: Role.USER }, select: { id: true } });
    expect(msg).toMatchObject({ workshopId: 7, senderId: 7, fromWorkshop: true, text: 'Salom' });
  });

  it('mijoz boshqa mijozning suhbatiga yoza olmaydi', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 8 });
    await expect(service.send(8, as(7, Role.USER), 'x', Role.USER)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });

  it('tikuv sexi mijoz suhbatiga yoza olmaydi', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 7 });
    await expect(service.send(7, as(3, Role.TAILOR), 'x', Role.USER)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('operator javobi — fromWorkshop=false', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 7 });
    const msg = await service.send(7, as(2, Role.OPERATOR), 'Javob', Role.USER);
    expect(msg).toMatchObject({ workshopId: 7, senderId: 2, fromWorkshop: false });
  });

  it('operator sex id bilan mijoz chatiga yoza olmaydi (rol tekshiriladi)', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.send(3, as(2, Role.OPERATOR), 'x', Role.USER)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('messages faqat qaytarilgan xabarlarni o‘qilgan qiladi', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 7 });
    prisma.chatMessage.findMany.mockResolvedValue([{ id: 12 }, { id: 10 }]);
    await service.messages(7, 'operator', undefined, Role.USER);
    expect(prisma.chatMessage.updateMany).toHaveBeenCalledWith({
      where: { workshopId: 7, fromWorkshop: true, readAt: null, id: { lte: 12 } },
      data: { readAt: expect.any(Date) },
    });
  });

  it('threads(USER) faqat yozgan mijozlarni oladi', async () => {
    prisma.chatMessage.groupBy
      .mockResolvedValueOnce([{ workshopId: 7, _max: { id: 5 } }])
      .mockResolvedValueOnce([{ workshopId: 7, _count: { _all: 2 } }]);
    prisma.user.findMany.mockResolvedValue([{ id: 7, fullName: 'Ali', workshopName: null, phone: '+998901112233' }]);
    prisma.chatMessage.findMany.mockResolvedValue([{ id: 5, workshopId: 7, text: 'Salom', fromWorkshop: true, createdAt: new Date() }]);
    const res = await service.threads(Role.USER);
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: Role.USER, id: { in: [7] } });
    expect(res).toEqual([expect.objectContaining({ workshopId: 7, name: 'Ali', unread: 2, phone: '+998901112233' })]);
  });
});
