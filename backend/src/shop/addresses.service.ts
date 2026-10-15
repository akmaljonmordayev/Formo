import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

export const MAX_ADDRESSES = 10;

const select = {
  id: true,
  label: true,
  address: true,
  apartment: true,
  latitude: true,
  longitude: true,
  isDefault: true,
} as const;

/** Buyurtmaga yoziladigan bir qatorli manzil: "Yunusobod, Amir Temur 108, 45-xonadon" */
export const formatAddress = (a: { address: string; apartment: string | null }) =>
  [a.address, a.apartment].filter(Boolean).join(', ');

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: number) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select,
    });
  }

  async get(userId: number, id: number) {
    const address = await this.prisma.address.findFirst({ where: { id, userId }, select });
    if (!address) throw new NotFoundException('Manzil topilmadi');
    return address;
  }

  async create(userId: number, dto: CreateAddressDto) {
    const count = await this.prisma.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) throw new BadRequestException(`${MAX_ADDRESSES} tadan ortiq manzil saqlab bo'lmaydi`);

    // Birinchi manzil avtomatik asosiy bo'ladi
    const isDefault = dto.isDefault ?? count === 0;
    return this.prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.create({ data: { ...dto, userId, isDefault }, select });
    });
  }

  async update(userId: number, id: number, dto: UpdateAddressDto) {
    await this.get(userId, id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.address.updateMany({ where: { userId, id: { not: id } }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: dto, select });
    });
  }

  async remove(userId: number, id: number) {
    const address = await this.get(userId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (address.isDefault) {
        const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return { message: "Manzil o'chirildi" };
  }
}
