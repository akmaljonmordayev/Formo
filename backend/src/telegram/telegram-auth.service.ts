import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, TelegramAuthChallenge, User } from '@prisma/client';
import { createHmac, randomBytes, randomInt } from 'crypto';
import { AuthService, ClientInfo, NEW_CUSTOMER_NAME, unusablePasswordHash } from '../auth/auth.service';
import { normalizePhone } from '../common/utils/phone';
import { PrismaService } from '../prisma/prisma.service';
import { loginTexts } from './bot-texts';
import { TelegramOutboxService } from './telegram-outbox.service';
import { sha256Hex as sha256, timingSafeEqualHex } from '../common/utils/timing-safe.util';

export const CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const CODE_TTL_MS = 5 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_CODE_SENDS = 3;
export const RESEND_COOLDOWN_MS = 30 * 1000;
export const MAX_CHALLENGES_PER_PHONE_HOUR = 10;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const INVALID_CODE = "Kod noto'g'ri yoki muddati o'tgan. Ilovada qaytadan urinib ko'ring";

/** Bot uchun javob: matnni bot o'zi tuzadi, backend faqat natija kodini beradi */
export type CodeResult =
  | { result: 'CODE'; code: string; expiresInSec: number; maskedPhone: string }
  | { result: 'COOLDOWN'; retryAfterSec: number }
  | { result: 'LIMIT' | 'NO_CHALLENGE' | 'CONTACT_REQUIRED' | 'PHONE_MISMATCH' };

/** "+998901234567" -> "+998 90 *** ** 67" — botda qaysi raqam uchun so'rov ekanini ko'rsatish uchun */
export function maskPhone(phone: string) {
  return phone.length === 13 ? `${phone.slice(0, 4)} ${phone.slice(4, 6)} *** ** ${phone.slice(11)}` : '***';
}

/**
 * Telegram bot orqali kirish. Ketma-ketlik:
 *   1. ilova: start(phone) → challengeId + bir martalik deep-link token
 *   2. bot:   claim(token) — so'rov shu Telegram foydalanuvchisiga bog'lanadi
 *   3. bot:   contact(phone) — Telegram tasdiqlagan raqam so'rovdagi raqamga teng bo'lsa, kod beriladi
 *   4. ilova: verify(challengeId, code) → sessiya; hisob bo'lmasa ochiladi, Telegram ulanadi
 * Telegram username hech qachon dalil sifatida ishlatilmaydi.
 */
@Injectable()
export class TelegramAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly outbox: TelegramOutboxService,
  ) {}

  private get botUsername() {
    return (this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? '').replace(/^@/, '').trim();
  }

  async start(phone: string, client: ClientInfo) {
    const bot = this.botUsername;
    if (!bot || !this.config.get<string>('TELEGRAM_INTERNAL_TOKEN')) {
      throw new ServiceUnavailableException('Telegram orqali kirish hozircha sozlanmagan');
    }
    const now = Date.now();
    // Javob raqam bazada bor-yo'qligiga bog'liq emas (enumeration bo'lmasin)
    const recent = await this.prisma.telegramAuthChallenge.count({
      where: { phone, createdAt: { gte: new Date(now - HOUR) } },
    });
    if (recent >= MAX_CHALLENGES_PER_PHONE_HOUR) {
      throw new HttpException("Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring", HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.prisma.telegramAuthChallenge.deleteMany({ where: { expiresAt: { lt: new Date(now - DAY) } } });

    const startToken = randomBytes(32).toString('base64url'); // 43 belgi — Telegram /start limiti 64
    const challenge = await this.prisma.telegramAuthChallenge.create({
      data: { phone, startTokenHash: sha256(startToken), ip: client.ip, expiresAt: new Date(now + CHALLENGE_TTL_MS) },
    });
    return {
      challengeId: challenge.id,
      botUsername: bot,
      deepLink: `https://t.me/${bot}?start=${startToken}`,
      expiresAt: challenge.expiresAt,
    };
  }

  /** Bot: /start <token>. Boshqa Telegram foydalanuvchisi egallagan so'rovni olib bo'lmaydi */
  async claim(startToken: string, telegramUserId: string, chatId: string, language?: string) {
    const now = new Date();
    const found = await this.prisma.telegramAuthChallenge.findUnique({ where: { startTokenHash: sha256(startToken) } });
    if (!found || !this.isOpen(found, now)) return { result: 'INVALID' as const };

    if (!found.telegramUserId) {
      await this.prisma.telegramAuthChallenge.updateMany({
        where: { id: found.id, telegramUserId: null },
        data: { telegramUserId, chatId, claimedAt: now, ...(language && { language }) },
      });
      const fresh = await this.prisma.telegramAuthChallenge.findUnique({ where: { id: found.id } });
      if (fresh?.telegramUserId !== telegramUserId) return { result: 'INVALID' as const };
    } else if (found.telegramUserId !== telegramUserId) {
      return { result: 'INVALID' as const };
    } else if (language && language !== found.language) {
      await this.prisma.telegramAuthChallenge.update({ where: { id: found.id }, data: { language } });
    }
    return { result: 'CONTACT_REQUIRED' as const, maskedPhone: maskPhone(found.phone) };
  }

  /** Bot: foydalanuvchi o'z kontaktini yubordi (bot contact.user_id === from.id ni tekshirgan) */
  async contact(telegramUserId: string, rawPhone: string, chatId?: string): Promise<CodeResult> {
    const phone = String(normalizePhone(rawPhone));
    const challenge = await this.resolveChallenge(telegramUserId, chatId ?? null, phone);
    if (!challenge) return { result: 'NO_CHALLENGE' };

    if (phone !== challenge.phone) {
      await this.prisma.telegramAuthChallenge.updateMany({
        where: { id: challenge.id, failedAt: null },
        data: { failedAt: new Date() },
      });
      return { result: 'PHONE_MISMATCH' };
    }
    if (!challenge.phoneVerifiedAt) {
      await this.prisma.telegramAuthChallenge.update({
        where: { id: challenge.id },
        data: { phoneVerifiedAt: new Date() },
      });
    }
    return this.issueCode(challenge);
  }

  /** Bot: "Yangi kod" tugmasi */
  async resend(telegramUserId: string): Promise<CodeResult> {
    const challenge = await this.activeChallenge(telegramUserId);
    if (!challenge) return { result: 'NO_CHALLENGE' };
    if (!challenge.phoneVerifiedAt) return { result: 'CONTACT_REQUIRED' };
    return this.issueCode(challenge);
  }

  /** Ilova: botdagi kodni tekshiradi va sessiya ochadi */
  async verify(challengeId: string, code: string, client: ClientInfo) {
    const now = new Date();
    // Urinish avval atomik band qilinadi — parallel so'rovlar bilan limitni aylanib o'tib bo'lmaydi
    const reserved = await this.prisma.telegramAuthChallenge.updateMany({
      where: {
        id: challengeId,
        consumedAt: null,
        failedAt: null,
        codeHash: { not: null },
        codeExpiresAt: { gt: now },
        expiresAt: { gt: now },
        attempts: { lt: MAX_CODE_ATTEMPTS },
      },
      data: { attempts: { increment: 1 } },
    });
    if (!reserved.count) throw new UnauthorizedException(INVALID_CODE);

    const challenge = await this.prisma.telegramAuthChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge?.codeHash || !challenge.telegramUserId || !this.hashMatches(this.codeHash(challenge.id, code), challenge.codeHash)) {
      if (challenge && challenge.attempts >= MAX_CODE_ATTEMPTS) {
        await this.prisma.telegramAuthChallenge.updateMany({ where: { id: challengeId, failedAt: null }, data: { failedAt: now } });
      }
      throw new UnauthorizedException("Tasdiqlash kodi noto'g'ri");
    }

    // Unik raqam bo'yicha poyga bo'lsa (ikki so'rov bir vaqtda yangi hisob ochmoqchi) — tranzaksiya
    // butunlay qaytadi, kod ishlatilmagan holda qoladi va klient qayta urinishi mumkin.
    const { user, isNewUser } = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.telegramAuthChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null, failedAt: null },
        data: { consumedAt: now },
      });
      if (!consumed.count) throw new UnauthorizedException(INVALID_CODE);

      const result = await this.findOrCreateUser(tx, challenge.phone);
      // Xodim hisoblari (admin/operator/tikuv sexi) faqat parol bilan kiradi va botga ulanmaydi
      if (result.user.role !== Role.USER) throw new ForbiddenException('Bu hisob uchun parol bilan kiring');
      if (!result.user.isActive) throw new ForbiddenException('Akkauntingiz bloklangan. Administratorga murojaat qiling');

      await this.link(tx, result.user.id, challenge.telegramUserId!, challenge.chatId, challenge.language);
      // Botda "kirdingiz" xabari pastki menyu bilan — mijoz "/" buyruqlarini yodlamasdan tugmalardan foydalanadi
      await this.outbox.enqueueForUser(tx, result.user.id, (lang) => loginTexts.linked(lang), `login:${challenge.id}`);
      return result;
    });

    const tokens = await this.auth.issueTokens(user, client);
    return { ...tokens, isNewUser, profileComplete: this.profileComplete(user) };
  }

  /** Bot: /start (payloadsiz) — ulangan bo'lsa xabarlarni qayta yoqadi (masalan /stop yoki bloklashdan keyin) */
  /**
   * login — ilovada ochilgan, shu Telegram foydalanuvchisiga tegishli kirish so'rovi (bo'lsa bot raqamni so'raydi):
   * avval egallangani, aks holda ulangan hisob raqamiga ochilgan so'rov (token botga yetib kelmagan holat).
   */
  async hello(telegramUserId: string, chatId: string) {
    // account va activeChallenge bir-biriga bog'liq emas — parallel so'raladi
    const accountLookup = this.prisma.telegramAccount.updateMany({ where: { telegramUserId }, data: { chatId } }).then(({ count }) =>
      count
        ? this.prisma.telegramAccount.findUnique({
            where: { telegramUserId },
            select: { language: true, user: { select: { phone: true } } },
          })
        : null,
    );
    const [account, activeChallenge] = await Promise.all([accountLookup, this.activeChallenge(telegramUserId)]);
    const challenge = await this.resolveChallenge(telegramUserId, chatId, account?.user.phone, activeChallenge);
    return {
      linked: Boolean(account),
      language: account?.language ?? null,
      login: challenge ? { maskedPhone: maskPhone(challenge.phone) } : null,
    };
  }

  /**
   * Shu Telegram foydalanuvchisiga tegishli ochiq so'rovni topadi: avval egallangani (yoki oldindan
   * hisoblangani — `prefetchedActive`, ikki marta so'ramaslik uchun), aks holda — raqam berilgan bo'lsa —
   * shu raqamga ochilgan so'rov(lar) shu foydalanuvchiga bog'lanadi.
   */
  private async resolveChallenge(
    telegramUserId: string,
    chatId: string | null,
    phone: string | null | undefined,
    prefetchedActive?: TelegramAuthChallenge | null,
  ) {
    const active = prefetchedActive !== undefined ? prefetchedActive : await this.activeChallenge(telegramUserId);
    return active ?? (phone ? this.claimByPhone(phone, telegramUserId, chatId) : null);
  }

  /**
   * Raqam bo'yicha hali hech kim egallamagan BARCHA ochiq so'rovlarni shu foydalanuvchiga bog'laydi
   * (bitta emas — masalan ilova qayta uringan yoki ikkita qurilmada ochilgan bo'lsa, har biri ilovada
   * boshqa challengeId bilan kutilayotgan bo'lishi mumkin; faqat "eng oxirgisi"ni bog'lasak, boshqa
   * qurilma/urinishda to'g'ri kod kiritilsa ham "noto'g'ri kod" xatosi chiqardi). Kod esa issueCode
   * orqali shu foydalanuvchining barcha bog'langan ochiq so'rovlariga ko'chiriladi (mirrorCodeToSiblings).
   */
  private async claimByPhone(phone: string, telegramUserId: string, chatId: string | null) {
    const now = new Date();
    await this.prisma.telegramAuthChallenge.updateMany({
      where: { phone, telegramUserId: null, consumedAt: null, failedAt: null, expiresAt: { gt: now } },
      data: { telegramUserId, chatId, claimedAt: now },
    });
    return this.activeChallenge(telegramUserId);
  }

  /** Bot: /stop — xabarlar o'chiriladi, ulanish saqlanadi */
  async stop(telegramUserId: string) {
    const { count } = await this.prisma.telegramAccount.updateMany({ where: { telegramUserId }, data: { chatId: null } });
    return { linked: count > 0 };
  }

  private isOpen(c: TelegramAuthChallenge, now: Date) {
    return !c.consumedAt && !c.failedAt && c.expiresAt > now;
  }

  /** Shu Telegram foydalanuvchisi oxirgi egallagan, hali ochiq so'rov */
  private activeChallenge(telegramUserId: string) {
    return this.prisma.telegramAuthChallenge.findFirst({
      where: { telegramUserId, consumedAt: null, failedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { claimedAt: 'desc' },
    });
  }

  private async issueCode(challenge: TelegramAuthChallenge): Promise<CodeResult> {
    const now = Date.now();
    if (challenge.codeSends >= MAX_CODE_SENDS) return { result: 'LIMIT' };
    if (challenge.codeSentAt) {
      const wait = challenge.codeSentAt.getTime() + RESEND_COOLDOWN_MS - now;
      if (wait > 0) return { result: 'COOLDOWN', retryAfterSec: Math.ceil(wait / 1000) };
    }

    const code = String(randomInt(0, 100_000)).padStart(5, '0');
    const codeExpiresAt = new Date(Math.min(now + CODE_TTL_MS, challenge.expiresAt.getTime()));
    // codeSends bo'yicha optimistik qulf: bir vaqtda ikki kod chiqmasin
    const { count } = await this.prisma.telegramAuthChallenge.updateMany({
      where: { id: challenge.id, codeSends: challenge.codeSends, consumedAt: null, failedAt: null },
      data: {
        codeHash: this.codeHash(challenge.id, code),
        codeExpiresAt,
        codeSentAt: new Date(now),
        codeSends: { increment: 1 },
      },
    });
    if (!count) return { result: 'COOLDOWN', retryAfterSec: Math.ceil(RESEND_COOLDOWN_MS / 1000) };
    if (challenge.telegramUserId) await this.mirrorCodeToSiblings(challenge, code, codeExpiresAt, new Date(now));
    return {
      result: 'CODE',
      code,
      expiresInSec: Math.round((codeExpiresAt.getTime() - now) / 1000),
      maskedPhone: maskPhone(challenge.phone),
    };
  }

  /**
   * Shu foydalanuvchiga bog'langan, hali ochiq boshqa so'rovlarga (bo'lsa) bir xil kodni yozadi —
   * claimByPhone bir nechta so'rovni bog'lagan bo'lishi mumkin, ilova esa ulardan qaysi birini
   * kutayotganidan qat'iy nazar shu kod ishlashi kerak. codeHash har bir so'rov o'z id'si bilan
   * HMAC qilingani uchun har biriga alohida hisoblanadi.
   */
  private async mirrorCodeToSiblings(challenge: TelegramAuthChallenge, code: string, codeExpiresAt: Date, sentAt: Date) {
    const siblings = await this.prisma.telegramAuthChallenge.findMany({
      where: {
        phone: challenge.phone,
        telegramUserId: challenge.telegramUserId,
        id: { not: challenge.id },
        consumedAt: null,
        failedAt: null,
        expiresAt: { gt: sentAt },
      },
    });
    if (!siblings.length) return;
    await this.prisma.$transaction(async (tx) => {
      for (const s of siblings) {
        await tx.telegramAuthChallenge.update({
          where: { id: s.id },
          data: { codeHash: this.codeHash(s.id, code), codeExpiresAt, codeSentAt: sentAt, codeSends: { increment: 1 } },
        });
      }
    });
  }

  private async findOrCreateUser(tx: Prisma.TransactionClient, phone: string): Promise<{ user: User; isNewUser: boolean }> {
    const existing = await tx.user.findUnique({ where: { phone } });
    if (existing) return { user: existing, isNewUser: false };
    const user = await tx.user.create({
      data: { phone, fullName: NEW_CUSTOMER_NAME, role: Role.USER, passwordHash: await unusablePasswordHash() },
    });
    return { user, isNewUser: true };
  }

  /** Bitta Telegram akkaunti faqat bitta Formo hisobiga ulanadi: avvalgi ulanish ko'chiriladi */
  private async link(
    tx: Prisma.TransactionClient,
    userId: number,
    telegramUserId: string,
    chatId: string | null,
    language: string | null,
  ) {
    await tx.telegramAccount.deleteMany({ where: { telegramUserId, userId: { not: userId } } });
    await tx.telegramAccount.upsert({
      where: { userId },
      create: { userId, telegramUserId, chatId, language },
      update: { telegramUserId, chatId, ...(language && { language }) },
    });
  }

  private profileComplete(user: User) {
    return user.fullName !== NEW_CUSTOMER_NAME && Boolean(user.gender) && user.age != null;
  }

  /** 5 xonali kod oddiy sha256 da oflayn tanlab topiladi — shuning uchun server kaliti bilan HMAC */
  private codeHash(challengeId: string, code: string) {
    const key = createHmac('sha256', this.config.getOrThrow<string>('JWT_ACCESS_SECRET')).update('telegram-otp').digest();
    return createHmac('sha256', key).update(`${challengeId}:${code}`).digest('hex');
  }

  private hashMatches(actual: string, expected: string) {
    return timingSafeEqualHex(actual, expected);
  }
}
