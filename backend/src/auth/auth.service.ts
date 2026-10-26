import {
  BadRequestException,
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
import { OtpLoginDto } from './dto/otp-login.dto';
import { RegisterDto, UpdateProfileDto } from './dto/register.dto';

export const BCRYPT_ROUNDS = 10;
// Haqiqiy SMS integratsiyasigacha: faqat shu kod to'g'ri deb hisoblanadi.
const DEMO_OTP_CODE = '12345';
/** Parolsiz ochilgan hisobning vaqtinchalik ismi — ilova shunda profil to'ldirishni so'raydi */
export const NEW_CUSTOMER_NAME = 'Yangi mijoz';

// Foydalanuvchi topilmaganda ham bcrypt ishlashi uchun (timing orqali raqam borligini bilib bo'lmasin).
// Parol tasodifiy va hech qayerda saqlanmaydi — bu xesh hech qachon "to'g'ri" bo'lmaydi.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

/**
 * Eski versiyada demo OTP orqali ochilgan hisoblar shu (repoda ochiq yozilgan) parolning xeshi bilan
 * saqlangan. Bunday hisobga parol bilan kirib bo'lmasligi uchun bu parol har doim rad etiladi.
 */
export const LEGACY_DUMMY_PASSWORD = 'formo-dummy-password';

/**
 * Demo SMS-login (kod 12345) faqat ishlab chiqish/test muhitida. Productionda hech qanday
 * sozlama bilan yoqilmaydi — aks holda istalgan mijoz hisobiga 12345 bilan kirish mumkin bo'ladi.
 * Ishlab chiqishda o'chirish: OTP_LOGIN_DEMO=false.
 */
export const otpLoginEnabled = () => process.env.NODE_ENV !== 'production' && process.env.OTP_LOGIN_DEMO !== 'false';

/**
 * Parol bilan ro'yxatdan o'tish raqam egaligini tekshirmaydi: begona raqamga oldindan parolli hisob
 * ochib, egasi keyin Telegram orqali kirganda o'sha hisobni kuzatish mumkin bo'lardi. Shuning uchun
 * productionda mijozlar faqat Telegram bot orqali hisob ochadi (POST /auth/telegram/*). Ishlab
 * chiqish/testda ochiq. Mavjud hisoblar uchun parol bilan kirish (/auth/login) o'zgarmaydi.
 */
export const passwordRegistrationEnabled = () => process.env.NODE_ENV !== 'production';

/** Parolsiz hisob: hech kim bilmaydigan tasodifiy parol xeshi (parol bilan kirib bo'lmaydi) */
export const unusablePasswordHash = () => bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

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
    if (!passwordRegistrationEnabled()) {
      throw new ForbiddenException("Ro'yxatdan o'tish Telegram bot orqali amalga oshiriladi");
    }
    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new ConflictException("Bu telefon raqam allaqachon ro'yxatdan o'tgan");
    this.assertUsablePassword(dto.password);

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

    // Eski demo-OTP hisoblarining ochiq paroli — mos kelsa ham rad etiladi
    if (!user || !valid || dto.password === LEGACY_DUMMY_PASSWORD) throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    if (!user.isActive) throw new ForbiddenException('Akkauntingiz bloklangan. Administratorga murojaat qiling');

    return this.issueTokens(user, client);
  }

  /**
   * Dev-only: SMS/OTP orqali parolsiz kirish. Haqiqiy SMS integratsiyasigacha
   * faqat demo kod (12345) qabul qilinadi. Hisob topilmasa avtomatik
   * ochiladi. Productionda o'chiq — u yerda Telegram bot orqali kirish ishlatiladi.
   */
  async otpLogin(dto: OtpLoginDto, client: ClientInfo) {
    if (!otpLoginEnabled()) {
      throw new ForbiddenException('SMS orqali kirish mavjud emas. Telegram orqali kiring');
    }
    if (dto.code !== DEMO_OTP_CODE) {
      throw new UnauthorizedException("Tasdiqlash kodi noto'g'ri");
    }

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          fullName: NEW_CUSTOMER_NAME,
          role: Role.USER,
          passwordHash: await unusablePasswordHash(),
        },
      });
    }
    // Faqat mobil mijozlar uchun — xodim hisoblari (admin/operator/tikuv sexi) parol bilan kiradi
    if (user.role !== Role.USER) {
      throw new ForbiddenException('Bu hisob uchun parol bilan kiring');
    }
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

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    return toPublicUser(user);
  }

  /** Parol almashtirilganda joriy sessiyadan boshqa hammasi yopiladi */
  async changePassword(userId: number, sessionId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const valid = user && dto.currentPassword !== LEGACY_DUMMY_PASSWORD && (await bcrypt.compare(dto.currentPassword, user.passwordHash));
    if (!valid) throw new UnauthorizedException("Joriy parol noto'g'ri");
    this.assertUsablePassword(dto.newPassword);

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

  private assertUsablePassword(password: string) {
    if (password === LEGACY_DUMMY_PASSWORD) throw new BadRequestException('Bu paroldan foydalanib bo‘lmaydi');
  }

  private revokeSession(sessionId: string) {
    return this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Yangi sessiya + token juftligi (Telegram orqali kirish ham shuni ishlatadi) */
  async issueTokens(user: User, client: ClientInfo) {
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
