import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../common/utils/user.mapper';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export const BCRYPT_ROUNDS = 10;
// Foydalanuvchi topilmaganda ham bcrypt ishlashi uchun (timing orqali raqam borligini bilib bo'lmasin)
const DUMMY_HASH = bcrypt.hashSync('formo-dummy-password', BCRYPT_ROUNDS);

export interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

export interface JwtPayload {
  sub: number;
  role: Role;
  sid: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Faqat mobil ilova foydalanuvchilari o'zi ro'yxatdan o'tadi (role = USER) */
  async register(dto: RegisterDto, client: ClientInfo) {
    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new ConflictException("Bu telefon raqam allaqachon ro'yxatdan o'tgan");

    const { password, ...profile } = dto;
    const user = await this.prisma.user.create({
      data: {
        ...profile,
        role: Role.USER,
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      },
    });

    return this.issueTokens(user, client);
  }

  /** Superadmin, operator, tikuv sexi va mobil foydalanuvchilar uchun umumiy login */
  async login(dto: LoginDto, client: ClientInfo) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !valid) throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    if (!user.isActive) throw new ForbiddenException('Akkauntingiz bloklangan. Administratorga murojaat qiling');

    return this.issueTokens(user, client);
  }

  /** Refresh token rotatsiyasi: eski token bekor bo'ladi, yangi juftlik qaytadi */
  async refresh(refreshToken: string) {
    const [sessionId, secret] = refreshToken.split('.');
    if (!sessionId || !secret) throw new UnauthorizedException('Refresh token yaroqsiz');

    const session = await this.prisma.session
      .findUnique({ where: { id: sessionId }, include: { user: true } })
      .catch(() => null); // id uuid bo'lmasa
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessiya tugagan, qaytadan kiring');
    }

    if (!this.hashMatches(secret, session.refreshTokenHash)) {
      // Eski (allaqachon almashtirilgan) token qayta ishlatildi — o'g'irlangan bo'lishi mumkin
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Sessiya tugagan, qaytadan kiring');
    }
    if (!session.user.isActive) {
      await this.revokeSession(session.id);
      throw new ForbiddenException('Akkauntingiz bloklangan');
    }

    const newSecret = randomBytes(32).toString('hex');
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: this.hash(newSecret), expiresAt: this.refreshExpiry() },
    });

    return {
      accessToken: await this.signAccess(session.user, session.id),
      refreshToken: `${session.id}.${newSecret}`,
      user: toPublicUser(session.user),
    };
  }

  async logout(sessionId: string) {
    await this.revokeSession(sessionId);
    return { message: 'Tizimdan chiqildi' };
  }

  async logoutAll(userId: number) {
    await this.revokeAllSessions(userId);
    return { message: 'Barcha qurilmalardan chiqildi' };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return toPublicUser(user);
  }

  /** Parol almashtirilganda joriy sessiyadan boshqa hammasi yopiladi */
  async changePassword(userId: number, sessionId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException("Joriy parol noto'g'ri");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null, id: { not: sessionId } },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'Parol yangilandi' };
  }

  revokeAllSessions(userId: number) {
    return this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private revokeSession(sessionId: string) {
    return this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: User, client: ClientInfo) {
    const secret = randomBytes(32).toString('hex');
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hash(secret),
        userAgent: client.userAgent?.slice(0, 255),
        ip: client.ip,
        expiresAt: this.refreshExpiry(),
      },
    });

    return {
      accessToken: await this.signAccess(user, session.id),
      refreshToken: `${session.id}.${secret}`,
      user: toPublicUser(user),
    };
  }

  private signAccess(user: User, sessionId: string) {
    const payload: JwtPayload = { sub: user.id, role: user.role, sid: sessionId };
    return this.jwt.signAsync(payload);
  }

  private refreshExpiry() {
    const days = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 30);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashMatches(value: string, expectedHash: string) {
    const a = Buffer.from(this.hash(value));
    const b = Buffer.from(expectedHash);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
