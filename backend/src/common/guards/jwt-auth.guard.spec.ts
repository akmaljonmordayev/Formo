import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(reflector);
  const context = { getHandler: () => undefined, getClass: () => undefined } as unknown as ExecutionContext;
  const passport = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');

  afterEach(() => jest.clearAllMocks());

  it('@Public endpoint — JWT tekshirilmaydi', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(passport).not.toHaveBeenCalled();
  });

  it('qolgan hamma endpoint — passport JWT tekshiruviga beriladi', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    passport.mockReturnValue(false);
    expect(guard.canActivate(context)).toBe(false);
    expect(passport).toHaveBeenCalledWith(context);
  });
});
