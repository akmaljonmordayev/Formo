import { Role } from '@prisma/client';

/** Kim kim bilan yoza oladi. USER ↔ TAILOR taqiqlangan: mijoz sex bilan faqat operator orqali gaplashadi. */
export const CHAT_ALLOWED: Record<Role, readonly Role[]> = {
  [Role.SUPERADMIN]: [Role.OPERATOR, Role.TAILOR, Role.USER],
  [Role.OPERATOR]: [Role.SUPERADMIN, Role.TAILOR, Role.USER],
  [Role.TAILOR]: [Role.OPERATOR, Role.SUPERADMIN],
  [Role.USER]: [Role.OPERATOR, Role.SUPERADMIN],
};

export const canChat = (a: Role, b: Role): boolean => CHAT_ALLOWED[a].includes(b) && CHAT_ALLOWED[b].includes(a);

const isStaff = (role: Role) => role === Role.SUPERADMIN || role === Role.OPERATOR;

interface Party {
  id: number;
  role: Role;
}

/**
 * Buyurtmaga bog'langan suhbat qoidasi: buyurtma staff bo'lmagan ishtirokchiga tegishli bo'lishi kerak
 * (USER → customerId, TAILOR → workshopId). Ikkala tomon ham staff bo'lsa — istalgan buyurtma.
 */
export function orderAccessible(order: { customerId: number | null; workshopId: number | null }, a: Party, b: Party): boolean {
  for (const p of [a, b]) {
    if (p.role === Role.USER && order.customerId !== p.id) return false;
    if (p.role === Role.TAILOR && order.workshopId !== p.id) return false;
  }
  return true;
}

export { isStaff };
