import { User } from '@prisma/client';

/** Parol xeshini hech qachon tashqariga chiqarmaymiz */
export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}
