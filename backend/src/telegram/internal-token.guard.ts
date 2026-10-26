import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';

/** Qisqa (taxmin qilinadigan) token bilan ichki API umuman ochilmaydi */
export const MIN_INTERNAL_TOKEN_LENGTH = 32;

const digest = (v: string) => createHash('sha256').update(v).digest();

/**
 * Servislararo (telegram-bot → backend) so'rovlar: `Authorization: Bearer <TELEGRAM_INTERNAL_TOKEN>`.
 * Token berilmagan yoki qisqa bo'lsa — ichki API yopiq.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('TELEGRAM_INTERNAL_TOKEN') ?? '';
    const header = context.switchToHttp().getRequest<Request>().headers.authorization ?? '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';

    // Uzunlikdan qat'i nazar doimiy vaqtda solishtirish uchun ikkalasi ham xeshlanadi
    const ok = expected.length >= MIN_INTERNAL_TOKEN_LENGTH && given.length > 0 && timingSafeEqual(digest(given), digest(expected));
    if (!ok) throw new UnauthorizedException();
    return true;
  }
}
