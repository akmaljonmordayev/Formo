import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // Har so'rovda sessiya tekshiriladi: logout yoki bloklashdan keyin token darhol o'ladi
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.userId !== payload.sub ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException('Sessiya tugagan, qaytadan kiring');
    }

    return { id: session.user.id, role: session.user.role, sessionId: session.id };
  }
}
