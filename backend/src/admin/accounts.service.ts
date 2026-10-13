import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService, BCRYPT_ROUNDS } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../common/utils/user.mapper';
import { ListQueryDto } from './dto/account.dto';

type AccountInput = {
  phone?: string;
  password?: string;
  fullName?: string;
  workshopName?: string;
  address?: string;
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

  async findSingle(role: Role) {
    const user = await this.prisma.user.findFirst({ where: { role } });
    if (!user) throw new NotFoundException('Akkaunt hali yaratilmagan');
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

  /**
   * Yagona akkauntli rol (operator) uchun yaratish. Serializable tranzaksiya
   * bir vaqtda kelgan ikki so'rov ikkita operator yaratib qo'yishiga yo'l qo'ymaydi.
   */
  async createSingle(role: Role, input: AccountInput & { phone: string; password: string; fullName: string }) {
    const { password, ...data } = input;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.$transaction(
        async (tx) => {
          if (await tx.user.count({ where: { role } })) {
            throw new ConflictException("Bu akkaunt allaqachon mavjud. Uni tahrirlang yoki o'chiring");
          }
          if (await tx.user.findUnique({ where: { phone: data.phone } })) {
            throw new ConflictException('Bu telefon raqam band');
          }
          return tx.user.create({ data: { ...data, role, passwordHash } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return toPublicUser(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(e.code)) {
        throw new ConflictException("Bu akkaunt allaqachon mavjud. Uni tahrirlang yoki o'chiring");
      }
      throw e;
    }
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
    await this.prisma.user.delete({ where: { id } }); // sessiyalar cascade bilan o'chadi
    return { message: "Akkaunt o'chirildi" };
  }

  private async ensurePhoneFree(phone: string, exceptId?: number) {
    const taken = await this.prisma.user.findUnique({ where: { phone } });
    if (taken && taken.id !== exceptId) throw new ConflictException('Bu telefon raqam band');
  }
}
