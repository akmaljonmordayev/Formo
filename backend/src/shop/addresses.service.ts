import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { regionLabel } from './regions';
import { tashkentPointMismatch } from './tashkent';

export const MAX_ADDRESSES = 10;

const select = {
  id: true,
  label: true,
  address: true,
  apartment: true,
  region: true,
  district: true,
  house: true,
  latitude: true,
  longitude: true,
  isDefault: true,
} as const;

/** "32" -> "32-uy"; foydalanuvchi o'zi so'z bilan yozgan bo'lsa ("32-dom", "12-uy") — o'zgarishsiz */
export const houseLabel = (house?: string | null) => {
  const h = (house ?? '').trim();
  if (!h) return null;
  return /^\d+\s*[A-Za-z\u0400-\u04FF]?(\/\d+)?$/.test(h) ? `${h}-uy` : h;
};

export interface AddressParts {
  address: string;
  apartment?: string | null;
  region?: string | null;
  district?: string | null;
  house?: string | null;
}

/**
 * Buyurtmaga yoziladigan bir qatorli to'liq manzil:
 * "Toshkent shahri, Sergeli tumani, Madadkor mahallasi, 32-uy, 45-xonadon".
 * Eski manzillar (viloyat/tuman/uy yo'q) — avvalgidek "Yunusobod, Amir Temur 108, 45-xonadon".
 * Matnda allaqachon yozilgan bo'lak (masalan, tuman nomi) takrorlanmaydi.
 */
export function formatAddress(a: AddressParts) {
  const text = a.address.toLowerCase();
  const lead = [regionLabel(a.region), a.district].filter((p): p is string => Boolean(p) && !text.includes(p!.toLowerCase()));
  return [...lead, a.address, houseLabel(a.house), a.apartment].filter(Boolean).join(', ');
}

const MISMATCH = "Xaritadagi nuqta Toshkent shahridan tashqarida — viloyatni to'g'ri tanlang yoki nuqtani shahar ichiga qo'ying";

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

    if (tashkentPointMismatch(dto)) throw new BadRequestException(MISMATCH);
    // Birinchi manzil avtomatik asosiy bo'ladi
    const isDefault = dto.isDefault ?? count === 0;
    return this.prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.create({ data: { ...dto, userId, isDefault }, select });
    });
  }

  async update(userId: number, id: number, dto: UpdateAddressDto) {
    const current = await this.get(userId, id);
    // Viloyat yoki nuqta alohida o'zgartirilsa ham — yakuniy juftlik tekshiriladi
    if (tashkentPointMismatch({ ...current, ...dto })) throw new BadRequestException(MISMATCH);
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
