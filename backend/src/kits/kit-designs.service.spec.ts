import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KitDesign } from '@prisma/client';
import { AuditService } from '../admin/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { KitDesignsService } from './kit-designs.service';

const row = (over: Partial<KitDesign> = {}): KitDesign => ({
  id: 1,
  designVersion: 1,
  name: 'Oqim',
  primaryColor: '#1f6f8b',
  secondaryColor: '#0b1d2a',
  textColor: '#e3c27a',
  pattern: 'fade',
  neck: 'round',
  sponsorText: 'KARVON',
  backTopText: '',
  crestImageUrl: null,
  sponsorImageUrl: null,
  thumbnailUrl: '/api/uploads/kits/thumb/00000000-0000-0000-0000-000000000000.png',
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

function setup() {
  const prisma = {
    kitDesign: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    pricingItem: { findMany: jest.fn().mockResolvedValue([{ key: 'club.tshirt', price: 120000 }]) },
  };
  const storage = { isOwnUrl: jest.fn(), put: jest.fn(), remove: jest.fn() };
  const audit = { log: jest.fn() };
  const service = new KitDesignsService(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
    audit as unknown as AuditService,
  );
  return { prisma, storage, audit, service };
}

describe('KitDesignsService — mobil uchun faqat nashr qilinganlar', () => {
  it("ro'yxat faqat isActive=true, tartib bo'yicha; narx server jadvalidan", async () => {
    const { prisma, service } = setup();
    prisma.kitDesign.findMany.mockResolvedValue([row()]);
    const list = await service.listPublished();
    expect(prisma.kitDesign.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    expect(list[0]).toMatchObject({ id: 1, name: 'Oqim', design: { designVersion: 1, pattern: 'fade', sponsorText: 'KARVON' } });
    // jadvalda bor kalit — jadvaldan, yo'qlari — standart qiymat
    expect(list[0].prices).toEqual({ shirt: 120000, shorts: 60000, print: 30000 });
    // ichki maydonlar (isActive, sortOrder, vaqtlar) ochiq javobga chiqmaydi
    expect(list[0]).not.toHaveProperty('isActive');
  });

  it('bitta dizayn: nashr qilinmagan yoki yo\'q — 404', async () => {
    const { prisma, service } = setup();
    prisma.kitDesign.findFirst.mockResolvedValue(null);
    await expect(service.getPublished(5)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.kitDesign.findFirst).toHaveBeenCalledWith({ where: { id: 5, isActive: true } });
  });
});

describe('KitDesignsService — admin', () => {
  const body = {
    name: 'Oqim',
    primaryColor: '#1f6f8b',
    secondaryColor: '#0b1d2a',
    textColor: '#e3c27a',
    pattern: 'fade',
    neck: 'round',
  };

  it("yangi dizayn standart holatda qoralama (nashr qilinmagan)", async () => {
    const { prisma, service } = setup();
    prisma.kitDesign.create.mockResolvedValue(row({ isActive: false }));
    await service.create({ design: body }, { id: 1, role: 'SUPERADMIN' } as never);
    expect(prisma.kitDesign.create.mock.calls[0][0].data).toMatchObject({ isActive: false, sortOrder: 0, sponsorText: '', backTopText: '' });
  });

  it('begona rasm manzili qabul qilinmaydi', async () => {
    const { storage, service } = setup();
    storage.isOwnUrl.mockReturnValue(false);
    await expect(
      service.create({ design: { ...body, crestImageUrl: 'https://evil.example/logo.png' } }, { id: 1 } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rasm turi baytlardan tekshiriladi: PNG nomli matn fayli rad etiladi", async () => {
    const { storage, service } = setup();
    await expect(service.upload('crest', { buffer: Buffer.from('<svg onload=alert(1)>'), size: 21 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("o'chirilganda faqat kichik rasm o'chadi (nishon buyurtma nusxalari uchun qoladi)", async () => {
    const { prisma, storage, service } = setup();
    prisma.kitDesign.findUnique.mockResolvedValue(row({ crestImageUrl: '/api/uploads/kits/crest/x.png' }));
    await service.remove(1, { id: 1 } as never);
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith(row().thumbnailUrl);
  });
});
