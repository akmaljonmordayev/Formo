import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CategoriesService } from './categories.service';
import { ClubsService } from './clubs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClubsService', () => {
  const prisma = {
    club: { findUnique: jest.fn() },
    kit: { findMany: jest.fn(), create: jest.fn() },
  };
  const audit = { log: jest.fn() };
  const categories = { resolve: jest.fn() };
  const service = new ClubsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    categories as unknown as CategoriesService,
  );

  beforeEach(() => jest.resetAllMocks());

  describe('listKits', () => {
    it('klub nomi, keyin sortOrder bo‘yicha tartiblanadi, club include qilinadi', async () => {
      prisma.kit.findMany.mockResolvedValue([{ id: 1, clubId: 5, label: 'Uy', club: { id: 5, name: 'Real Madrid' } }]);

      const result = await service.listKits();

      expect(prisma.kit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ club: { name: 'asc' } }, { sortOrder: 'asc' }],
          include: { club: expect.objectContaining({ select: expect.objectContaining({ name: true }) }) },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('createKit', () => {
    const dto = { label: 'Uchinchi', bgColor: '#111111', textColor: '#ffffff' };

    it('klub topilmasa — 404, yaratilmaydi', async () => {
      prisma.club.findUnique.mockResolvedValue(null);
      await expect(service.createKit(99, dto, null)).rejects.toThrow(NotFoundException);
      expect(prisma.kit.create).not.toHaveBeenCalled();
    });

    it('klubda allaqachon 3 ta forma bo‘lsa — 400, yaratilmaydi', async () => {
      prisma.club.findUnique.mockResolvedValue({ id: 5, name: 'Real Madrid', _count: { kits: 3 } });
      await expect(service.createKit(5, dto, null)).rejects.toThrow(BadRequestException);
      expect(prisma.kit.create).not.toHaveBeenCalled();
    });

    it('bo‘sh joy bo‘lsa — formani yaratadi, sortOrder mavjud sonidan davom etadi', async () => {
      prisma.club.findUnique.mockResolvedValue({ id: 5, name: 'Real Madrid', _count: { kits: 2 } });
      prisma.kit.create.mockImplementation(async ({ data }) => ({ id: 10, ...data }));

      const result = await service.createKit(5, dto, null);

      expect(prisma.kit.create).toHaveBeenCalledWith({ data: { ...dto, clubId: 5, sortOrder: 2 } });
      expect(result).toMatchObject({ id: 10, label: 'Uchinchi', clubId: 5, sortOrder: 2 });
      expect(audit.log).toHaveBeenCalled();
    });
  });
});
