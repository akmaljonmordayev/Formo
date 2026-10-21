import { Role } from '@prisma/client';
import { canChat, orderAccessible } from './chat.policy';

describe('chat.policy', () => {
  const roles = Object.values(Role);
  const allowed: [Role, Role][] = [
    [Role.USER, Role.OPERATOR],
    [Role.USER, Role.SUPERADMIN],
    [Role.OPERATOR, Role.TAILOR],
    [Role.OPERATOR, Role.SUPERADMIN],
    [Role.TAILOR, Role.SUPERADMIN],
  ];

  it('ruxsat etilgan juftliklar ikki tomonlama ishlaydi', () => {
    for (const [a, b] of allowed) {
      expect(canChat(a, b)).toBe(true);
      expect(canChat(b, a)).toBe(true);
    }
  });

  it('qolgan hamma juftlik (USER ↔ TAILOR, bir xil rol) taqiqlangan', () => {
    for (const a of roles) {
      for (const b of roles) {
        const ok = allowed.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
        expect(canChat(a, b)).toBe(ok);
      }
    }
  });

  describe('orderAccessible', () => {
    const order = { customerId: 10, workshopId: 20 };
    it('USER faqat o‘z buyurtmasi, TAILOR faqat o‘ziga biriktirilgani', () => {
      expect(orderAccessible(order, { id: 10, role: Role.USER }, { id: 1, role: Role.OPERATOR })).toBe(true);
      expect(orderAccessible(order, { id: 11, role: Role.USER }, { id: 1, role: Role.OPERATOR })).toBe(false);
      expect(orderAccessible(order, { id: 1, role: Role.OPERATOR }, { id: 20, role: Role.TAILOR })).toBe(true);
      expect(orderAccessible(order, { id: 1, role: Role.OPERATOR }, { id: 21, role: Role.TAILOR })).toBe(false);
      expect(orderAccessible({ customerId: 10, workshopId: null }, { id: 20, role: Role.TAILOR }, { id: 1, role: Role.OPERATOR })).toBe(false);
    });
    it('ikkala tomon xodim bo‘lsa istalgan buyurtma', () => {
      expect(orderAccessible(order, { id: 1, role: Role.OPERATOR }, { id: 2, role: Role.SUPERADMIN })).toBe(true);
    });
  });
});
