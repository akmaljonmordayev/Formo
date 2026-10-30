import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalTokenGuard } from './internal-token.guard';

const TOKEN = 'a'.repeat(48);
const ctx = (authorization?: string) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }) }) as unknown as ExecutionContext;
const guard = (token?: string) => new InternalTokenGuard({ get: () => token } as unknown as ConfigService);

describe('InternalTokenGuard', () => {
  it('to‘g‘ri Bearer token — ruxsat', () => {
    expect(guard(TOKEN).canActivate(ctx(`Bearer ${TOKEN}`))).toBe(true);
  });

  it.each([undefined, '', `Basic ${TOKEN}`, `Bearer ${TOKEN}x`, `Bearer ${TOKEN.slice(1)}`, 'Bearer '])(
    'noto‘g‘ri sarlavha (%s) — 401',
    (header) => {
      expect(() => guard(TOKEN).canActivate(ctx(header))).toThrow(UnauthorizedException);
    },
  );

  it('serverda token berilmagan yoki qisqa — ichki API yopiq', () => {
    expect(() => guard(undefined).canActivate(ctx('Bearer '))).toThrow(UnauthorizedException);
    expect(() => guard('short').canActivate(ctx('Bearer short'))).toThrow(UnauthorizedException);
  });
});
