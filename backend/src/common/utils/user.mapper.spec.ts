import { Role, User } from '@prisma/client';
import { toPublicUser } from './user.mapper';

describe('toPublicUser', () => {
  const user = {
    id: 1,
    phone: '+998901234567',
    passwordHash: '$2a$10$hash',
    role: Role.USER,
    fullName: 'Aziz',
    isActive: true,
  } as User;

  it('passwordHash ni olib tashlaydi, qolganini saqlaydi', () => {
    const result = toPublicUser(user);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toEqual({ id: 1, phone: '+998901234567', role: Role.USER, fullName: 'Aziz', isActive: true });
  });

  it('asl obyektni o‘zgartirmaydi', () => {
    toPublicUser(user);
    expect(user.passwordHash).toBe('$2a$10$hash');
  });
});
