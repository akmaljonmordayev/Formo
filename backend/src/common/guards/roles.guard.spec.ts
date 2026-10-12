import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

const contextWith = (user?: { role: Role }) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const requireRoles = (roles?: Role[]) => jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  afterEach(() => jest.restoreAllMocks());

  it('@Roles qo‘yilmagan endpoint — hammaga ochiq', () => {
    requireRoles(undefined);
    expect(guard.canActivate(contextWith({ role: Role.USER }))).toBe(true);
    requireRoles([]);
    expect(guard.canActivate(contextWith())).toBe(true);
  });

  it('roli mos kelsa o‘tkazadi', () => {
    requireRoles([Role.SUPERADMIN, Role.OPERATOR]);
    expect(guard.canActivate(contextWith({ role: Role.OPERATOR }))).toBe(true);
  });

  it('roli mos kelmasa — 403', () => {
    requireRoles([Role.SUPERADMIN]);
    expect(() => guard.canActivate(contextWith({ role: Role.TAILOR }))).toThrow(ForbiddenException);
  });

  it('foydalanuvchi umuman bo‘lmasa — 403', () => {
    requireRoles([Role.SUPERADMIN]);
    expect(() => guard.canActivate(contextWith())).toThrow(ForbiddenException);
  });
});
