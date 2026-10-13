import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/utils/phone';
import { BCRYPT_ROUNDS } from './auth.service';

/** Superadmin yagona akkaunt: yo'q bo'lsa .env dagi ma'lumotlar bilan yaratiladi */
@Injectable()
export class SuperadminSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperadminSeed.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const existing = await this.prisma.user.findFirst({ where: { role: Role.SUPERADMIN } });
    if (existing) return;

    const phone = normalizePhone(this.config.get<string>('SUPERADMIN_PHONE')) as string;
    const password = this.config.get<string>('SUPERADMIN_PASSWORD');
    if (!phone || !password) {
      this.logger.warn('SUPERADMIN_PHONE / SUPERADMIN_PASSWORD berilmagan — superadmin yaratilmadi');
      return;
    }

    const taken = await this.prisma.user.findUnique({ where: { phone } });
    if (taken) {
      this.logger.error(`${phone} raqami boshqa akkauntda band — superadmin yaratilmadi`);
      return;
    }

    await this.prisma.user.create({
      data: {
        phone,
        fullName: this.config.get<string>('SUPERADMIN_NAME') ?? 'Super Admin',
        role: Role.SUPERADMIN,
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      },
    });
    this.logger.log(`Superadmin yaratildi: ${phone}`);
  }
}
