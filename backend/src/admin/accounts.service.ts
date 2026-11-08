import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService, BCRYPT_ROUNDS } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../common/utils/user.mapper';
import { ListQueryDto } from './dto/account.dto';
import { ACTIVE_STATUSES as ACTIVE_WORKSHOP_STATUSES } from './orders.service';

type AccountInput = {
  phone?: string;
  password?: string;
  fullName?: string;
  workshopName?: string;
  address?: string;
  dailyCapacity?: number | null;
  isActive?: boolean;
};

/** Superadmin boshqaradigan akkauntlar (operator, tikuv sexi, mobil foydalanuvchi) uchun umumiy CRUD */
@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async list(role: Role, query: ListQueryDto) {
    const { search, isActive, page = 1, limit = 20 } = query;
    const where: Prisma.UserWhereInput = { role };
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      const digits = search.replace(/\D/g, '');
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { workshopName: { contains: search, mode: 'insensitive' } },
        ...(digits ? [{ phone: { contains: digits } }] : []),
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(toPublicUser), total, page, limit };
  }

  async findOne(role: Role, id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, role } });
    if (!user) throw new NotFoundException('Akkaunt topilmadi');
    return toPublicUser(user);
  }

  async create(role: Role, input: AccountInput & { phone: string; password: string; fullName: string }) {
    await this.ensurePhoneFree(input.phone);
    const { password, ...data } = input;
    const user = await this.prisma.user.create({
      data: { ...data, role, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
    });
    return toPublicUser(user);
  }

  async update(role: Role, id: number, input: AccountInput) {
    const current = await this.findOne(role, id);
    const { password, ...data } = input;

    if (data.phone && data.phone !== current.phone) await this.ensurePhoneFree(data.phone, id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(password && { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) }),
      },
    });

    // Parol almashsa yoki bloklansa — barcha qurilmalardan chiqarib yuboriladi
    if (password || data.isActive === false) await this.auth.revokeAllSessions(id);

    return toPublicUser(user);
  }

  async remove(role: Role, id: number) {
    await this.findOne(role, id);

    if (role === Role.TAILOR) {
      const activeOrders = await this.prisma.order.count({
        where: { workshopId: id, status: { in: ACTIVE_WORKSHOP_STATUSES } },
      });
      if (activeOrders > 0) {
        throw new ConflictException(
          "Bu tikuv sexida jarayondagi buyurtmalar bor, uni o'chirib bo'lmaydi. Avval buyurtmalarni boshqa sexga o'tkazing yoki yakunlang",
        );
      }
    }

    try {
      await this.prisma.user.delete({ where: { id } }); // sessiyalar cascade bilan o'chadi
    } catch (e) {
      // Hamyon tarixi (BalanceTransaction, TopUp) moliyaviy jurnal — Restrict bilan himoyalangan
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException(
          "Akkauntda hamyon tarixi bor, uni o'chirib bo'lmaydi. O'rniga akkauntni bloklang",
        );
      }
      throw e;
    }
    return { message: "Akkaunt o'chirildi" };
  }

  private async ensurePhoneFree(phone: string, exceptId?: number) {
    const taken = await this.prisma.user.findUnique({ where: { phone } });
    if (taken && taken.id !== exceptId) throw new ConflictException('Bu telefon raqam band');
  }
}
