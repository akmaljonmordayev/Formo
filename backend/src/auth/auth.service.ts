import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../common/utils/user.mapper';
import { sha256Hex, timingSafeEqualHex } from '../common/utils/timing-safe.util';
import { detectImage } from '../storage/file-type';
import { StorageService } from '../storage/storage.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { OtpLoginDto } from './dto/otp-login.dto';
import { RegisterDto, UpdateProfileDto } from './dto/register.dto';

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
/** multer xotirada bergan fayl (servisga faqat shu ikki maydon kerak) */
export type UploadedImage = { buffer: Buffer; size: number };

export const BCRYPT_ROUNDS = 10;
// Haqiqiy SMS integratsiyasigacha: faqat shu kod to'g'ri deb hisoblanadi.
const DEMO_OTP_CODE = '12345';
/**
 * /auth/login IP bo'yicha cheklangan (@Throttle), lekin bu VPN/proksi bilan chetlab o'tiladi —
 * shuning uchun urinishlar hisobning o'zida (User.failedLoginAttempts) ham sanaladi.
 */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
/** Parolsiz ochilgan hisobning vaqtinchalik ismi — ilova shunda profil to'ldirishni so'raydi */
export const NEW_CUSTOMER_NAME = 'Yangi mijoz';
/**
 * Rotatsiyadan keyin oldingi refresh token shuncha vaqt qabul qilinadi: javob tarmoqda yo'qolsa
 * (mijoz eski tokenda qoladi) yoki ikki tab/so'rov bir vaqtda yangilasa, sessiya o'g'irlik deb yopilmasin.
 * Undan eski yoki grace'dan keyin ishlatilgan token — hali ham qayta ishlatish (sessiya bekor qilinadi).
 */
export const REFRESH_REUSE_GRACE_MS = 60_000;

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
    private readonly storage: StorageService,
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

    // Hisob hozir bloklangan bo'lsa — parolni tekshirmasdan rad etiladi (VPN bilan IP-cheklovni
    // aylanib o'tib ham bu limitdan qochib bo'lmaydi, chunki hisobning o'ziga bog'langan)
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfterSec = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new HttpException(
        `Juda ko'p noto'g'ri urinish. ${Math.ceil(retryAfterSec / 60)} daqiqadan keyin qayta urinib ko'ring`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    // Bloklash muddati tugagan — hisoblagich noldan boshlanadi. Aks holda keyingi bitta xato yana
    // 15 daqiqaga bloklardi va raqamni bilgan har kim xodim hisobini doimiy bloklab tura olardi
    if (user?.lockedUntil) {
      await this.prisma.user.updateMany({
        where: { id: user.id, lockedUntil: user.lockedUntil },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);

    // Eski demo-OTP hisoblarining ochiq paroli — mos kelsa ham rad etiladi
    if (!user || !valid || dto.password === LEGACY_DUMMY_PASSWORD) {
      if (user) await this.registerFailedLogin(user.id);
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    }
    if (!user.isActive) throw new ForbiddenException('Akkauntingiz bloklangan. Administratorga murojaat qiling');

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    }
    return this.issueTokens(user, client);
  }

  /**
   * Muvaffaqiyatsiz urinish: hisoblagich atomik oshiriladi (parallel so'rovlar ham to'g'ri sanaladi —
   * oddiy "o'qi-yoz" emas, bitta UPDATE ... increment), chegaraga yetsa hisob vaqtincha bloklanadi.
   */
  private async registerFailedLogin(userId: number) {
    const { failedLoginAttempts } = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.prisma.user.update({ where: { id: userId }, data: { lockedUntil: new Date(Date.now() + LOGIN_LOCKOUT_MS) } });
    }
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

  /**
   * Refresh token rotatsiyasi: eski token bekor bo'ladi, yangi juftlik qaytadi. Rotatsiya shartli (atomik):
   * parallel so'rov yutqazsa sessiya yopilmaydi — qayta o'qib, grace oynasidagi oldingi token sifatida o'tadi.
   */
  async refresh(refreshToken: string) {
    const [sessionId, secret] = refreshToken.split('.');
    if (!sessionId || !secret) throw new UnauthorizedException('Refresh token yaroqsiz');

    for (let attempt = 0; attempt < 3; attempt++) {
      const session = await this.prisma.session
        .findUnique({ where: { id: sessionId }, include: { user: true } })
        .catch(() => null); // id uuid bo'lmasa
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Sessiya tugagan, qaytadan kiring');
      }

      const current = this.hashMatches(secret, session.refreshTokenHash);
      const graced =
        !current &&
        session.prevRefreshTokenHash != null &&
        session.rotatedAt != null &&
        Date.now() - session.rotatedAt.getTime() < REFRESH_REUSE_GRACE_MS &&
        this.hashMatches(secret, session.prevRefreshTokenHash);
      if (!current && !graced) {
        // Eski (allaqachon almashtirilgan) token qayta ishlatildi — o'g'irlangan bo'lishi mumkin
        await this.revokeSession(session.id);
        throw new UnauthorizedException('Sessiya tugagan, qaytadan kiring');
      }
      if (!session.user.isActive) {
        await this.revokeSession(session.id);
        throw new ForbiddenException('Akkauntingiz bloklangan');
      }

      const newSecret = randomBytes(32).toString('hex');
      const { count } = await this.prisma.session.updateMany({
        where: { id: session.id, revokedAt: null, refreshTokenHash: session.refreshTokenHash },
        data: {
          refreshTokenHash: this.hash(newSecret),
          prevRefreshTokenHash: session.refreshTokenHash,
          rotatedAt: new Date(),
          expiresAt: this.refreshExpiry(),
        },
      });
      if (!count) continue; // boshqa so'rov shu orada almashtirdi — qayta o'qiymiz

      return {
        accessToken: await this.signAccess(session.user, session.id),
        refreshToken: `${session.id}.${newSecret}`,
        user: toPublicUser(session.user),
      };
    }
    throw new UnauthorizedException('Sessiya tugagan, qaytadan kiring');
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

  /** Profil rasmi: PNG/JPEG/WEBP (haqiqiy turi baytlardan), 2 MB gacha */
  async setAvatar(userId: number, file: UploadedImage | undefined) {
    if (!file?.buffer?.length) throw new BadRequestException('Fayl yuborilmadi (maydon nomi: file)');
    if (file.size > MAX_AVATAR_BYTES) throw new BadRequestException('Fayl 2 MB dan katta');
    const type = detectImage(file.buffer);
    if (!type) throw new BadRequestException('Faqat PNG, JPEG yoki WEBP rasm qabul qilinadi');

    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const url = await this.storage.put('avatars', type.ext, file.buffer, type.mime);
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });
    await this.storage.remove(current.avatarUrl);
    return toPublicUser(user);
  }

  async removeAvatar(userId: number) {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    await this.storage.remove(current.avatarUrl);
    return toPublicUser(user);
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
    return sha256Hex(value);
  }

  private hashMatches(value: string, expectedHash: string) {
    return timingSafeEqualHex(this.hash(value), expectedHash);
  }
}
