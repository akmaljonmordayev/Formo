/**
 * Lokal (dev) bazaga dashboard'larni sinash uchun test ma'lumotlari: operator, tikuv sexlari,
 * mijozlar, turli holatdagi buyurtmalar, zaxira, qo'lda to'lov kartasi va ochiq to'ldirish so'rovi.
 *
 *   pnpm seed:dev            (avval: pnpm catalog:import — buyurtmalar katalog formalariga bog'lanadi)
 *
 * Takroran ishga tushirish xavfsiz: mavjud hisoblar (telefon bo'yicha) va FRM-9xxxx buyurtmalar qayta yaratilmaydi,
 * mavjud yozuvlar o'zgartirilmaydi. NODE_ENV=production yoki localhost bo'lmagan DATABASE_URL bilan ishlamaydi.
 * Parollar faqat dev uchun — productionda bu skript ishlamaydi.
 */
import { Gender, OrderStatus, PaymentMethod, PaymentStatus, Prisma, PrismaClient, Role, TopUpMethod } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const DEV_PASSWORD = { operator: 'operator123', tailor: 'tailor123', customer: 'mijoz123' };

function assertSafeTarget() {
  if (process.env.NODE_ENV === 'production') throw new Error('NODE_ENV=production — seed qilinmaydi');
  const url = process.env.DATABASE_URL ?? '';
  const host = /@([^:/?]+)/.exec(url)?.[1] ?? '';
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error(`DATABASE_URL lokal emas (${host || 'noma’lum'}) — seed qilinmaydi`);
}

const FLOW: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.SENT_TO_WORKSHOP,
  OrderStatus.ACCEPTED,
  OrderStatus.PRINTING,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
];

const ACTOR: Partial<Record<OrderStatus, string>> = {
  NEW: 'USER',
  SENT_TO_WORKSHOP: 'OPERATOR',
  ACCEPTED: 'TAILOR',
  PRINTING: 'TAILOR',
  QUALITY_CHECK: 'TAILOR',
  READY: 'TAILOR',
  DELIVERING: 'OPERATOR',
  DELIVERED: 'OPERATOR',
  CANCELLED: 'OPERATOR',
};

const CUSTOMERS = [
  { phone: '+998900000031', fullName: 'Aziz Rahimov', gender: Gender.MALE, age: 27, height: 178, weight: 74, address: 'Yunusobod, Amir Temur 108' },
  { phone: '+998900000032', fullName: 'Dilnoza Karimova', gender: Gender.FEMALE, age: 24, height: 165, weight: 56, address: 'Chilonzor 9-kvartal, 14-uy' },
  { phone: '+998900000033', fullName: 'Jasur Toshmatov', gender: Gender.MALE, age: 16, height: 170, weight: 60, address: 'Mirzo Ulug‘bek, Buyuk Ipak yo‘li 45' },
  { phone: '+998900000034', fullName: 'Sardor Aliyev', gender: Gender.MALE, age: 33, height: 182, weight: 86, address: 'Sergeli, Yangi Sergeli 3' },
];

// [mijoz indeksi, oxirgi holat, ism, raqam, o'lcham, shortik bilan, sex indeksi]
const ORDERS: [number, OrderStatus, string, string, string, boolean, number][] = [
  [0, OrderStatus.NEW, 'AZIZ', '10', 'L', true, 0],
  [1, OrderStatus.NEW, 'DILNOZA', '7', 'S', false, 0],
  [2, OrderStatus.SENT_TO_WORKSHOP, 'JASUR', '9', 'M', true, 0],
  [3, OrderStatus.ACCEPTED, 'SARDOR', '4', 'XL', true, 0],
  [0, OrderStatus.PRINTING, 'RAHIMOV', '23', 'L', true, 0],
  [1, OrderStatus.QUALITY_CHECK, 'KARIMOVA', '11', 'S', false, 1],
  [2, OrderStatus.READY, 'JASUR', '17', 'M', true, 1],
  [3, OrderStatus.DELIVERING, 'ALIYEV', '8', 'XL', true, 0],
  [0, OrderStatus.DELIVERED, 'AZIZ', '10', 'L', true, 0],
  [3, OrderStatus.DELIVERED, 'SARDOR', '99', 'XXL', false, 1],
  [1, OrderStatus.CANCELLED, 'DILNOZA', '1', 'S', true, 0],
];

async function upsertUser(prisma: PrismaClient, data: Prisma.UserCreateInput, password: string, created: string[]) {
  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing) return existing;
  const user = await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  created.push(`${data.role ?? Role.USER} ${data.phone} / ${password}`);
  return user;
}

async function main() {
  assertSafeTarget();
  const prisma = new PrismaClient();
  const created: string[] = [];
  try {
    // ---- Hisoblar (operator — yagona; bor bo'lsa tegilmaydi) ----
    const operator =
      (await prisma.user.findFirst({ where: { role: Role.OPERATOR } })) ??
      (await upsertUser(prisma, { phone: '+998900000010', fullName: 'Malika Operator', role: Role.OPERATOR, passwordHash: '' }, DEV_PASSWORD.operator, created));

    const workshops = [
      await upsertUser(
        prisma,
        {
          phone: '+998900000020',
          fullName: 'Bekzod Usmonov',
          role: Role.TAILOR,
          passwordHash: '',
          workshopName: 'Chilonzor tikuv sexi',
          address: 'Chilonzor, Bunyodkor 12',
          dailyCapacity: 40,
          shiftStart: '09:00',
          shiftEnd: '18:00',
        },
        DEV_PASSWORD.tailor,
        created,
      ),
      await upsertUser(
        prisma,
        {
          phone: '+998900000021',
          fullName: 'Nodira Saidova',
          role: Role.TAILOR,
          passwordHash: '',
          workshopName: 'Yunusobod print studiyasi',
          address: 'Yunusobod 4-mavze, 21',
          dailyCapacity: 25,
          shiftStart: '10:00',
          shiftEnd: '19:00',
        },
        DEV_PASSWORD.tailor,
        created,
      ),
    ];

    const customers = [];
    for (const c of CUSTOMERS) {
      const { address, ...profile } = c;
      const user = await upsertUser(prisma, { ...profile, role: Role.USER, passwordHash: '' }, DEV_PASSWORD.customer, created);
      if (!(await prisma.address.count({ where: { userId: user.id } }))) {
        await prisma.address.create({ data: { userId: user.id, label: 'Uy', address, isDefault: true } });
      }
      customers.push({ ...user, address });
    }

    // ---- Buyurtmalar ----
    let orders = 0;
    if (!(await prisma.order.count({ where: { code: { startsWith: 'FRM-9' } } }))) {
      const kits = await prisma.kit.findMany({ where: { isActive: true }, include: { club: true }, orderBy: { id: 'asc' }, take: 20 });
      if (!kits.length) throw new Error('Katalog bo‘sh — avval: pnpm catalog:import');
      for (const [i, [ci, status, printName, printNumber, size, withShorts, wi]] of ORDERS.entries()) {
        const customer = customers[ci];
        const workshop = workshops[wi];
        const kit = kits[(i * 3) % kits.length];
        const unitPrice = kit.shirtPrice + (withShorts ? kit.shortsPrice : 0) + kit.printPrice;
        const deliverySum = 20000;
        const createdAt = new Date(Date.now() - (ORDERS.length - i) * 7 * 3600_000);
        const steps = status === OrderStatus.CANCELLED ? [OrderStatus.NEW, OrderStatus.CANCELLED] : FLOW.slice(0, FLOW.indexOf(status) + 1);
        const assigned = steps.includes(OrderStatus.SENT_TO_WORKSHOP);
        const delivered = status === OrderStatus.DELIVERED;
        await prisma.order.create({
          data: {
            code: `FRM-9${String(1000 + i).padStart(4, '0')}`,
            customerId: customer.id,
            customerName: customer.fullName,
            customerPhone: customer.phone,
            workshopId: assigned ? workshop.id : null,
            clubId: kit.clubId,
            kitLabel: kit.label,
            printName,
            printNumber,
            size,
            quantity: 1,
            subtotalSum: unitPrice,
            deliverySum,
            totalSum: unitPrice + deliverySum,
            deliveryDate: new Date(createdAt.getTime() + 3 * 86400_000),
            deliverySlot: '10:00-14:00',
            deliveryAddress: customer.address,
            paymentMethod: PaymentMethod.CASH,
            paymentStatus: delivered ? PaymentStatus.PAID : PaymentStatus.PENDING,
            paidAt: delivered ? new Date(createdAt.getTime() + 3 * 86400_000) : null,
            status,
            createdAt,
            items: {
              create: {
                kitId: kit.id,
                clubName: kit.club.name,
                kitLabel: kit.label,
                printName,
                printNumber,
                withShorts,
                numberOnShorts: withShorts && i % 2 === 0,
                shirtSize: size,
                shortsSize: withShorts ? size : null,
                quantity: 1,
                unitPrice,
                totalPrice: unitPrice,
              },
            },
            statusLogs: {
              create: steps.map((to, s) => {
                const role = ACTOR[to] ?? 'OPERATOR';
                const actor = role === 'USER' ? customer : role === 'TAILOR' ? workshop : operator;
                return {
                  fromStatus: s ? steps[s - 1] : null,
                  toStatus: to,
                  actorId: actor.id,
                  actorName: actor.fullName,
                  actorRole: role,
                  note: to === OrderStatus.CANCELLED ? 'Mijoz so‘rovi bilan bekor qilindi' : null,
                  createdAt: new Date(createdAt.getTime() + s * 4 * 3600_000),
                };
              }),
            },
          },
        });
        orders++;
      }
    }

    // ---- Zaxira (faqat yo'q qatorlar) ----
    let inventory = 0;
    for (const productType of ['TSHIRT', 'SHORTS'] as const) {
      for (const color of ['oq', 'qora', 'toqkok', 'qizil']) {
        for (const [si, size] of ['S', 'M', 'L', 'XL', 'XXL'].entries()) {
          const key = { productType_color_size: { productType, color, size } };
          if (await prisma.inventoryItem.findUnique({ where: key })) continue;
          await prisma.inventoryItem.create({ data: { productType, color, size, qty: 6 + ((si * 7 + color.length * 3) % 30) } });
          inventory++;
        }
      }
    }

    // ---- Qo'lda to'lov kartasi (bor bo'lsa tegilmaydi) ----
    const manual = await prisma.setting.findUnique({ where: { key: 'payments.manual' } });
    if (!manual) {
      await prisma.setting.create({
        data: { key: 'payments.manual', value: { enabled: true, cardNumber: '9860011202074545', cardHolder: 'Abdulla Yakubov' } },
      });
    }

    // ---- Ochiq to'ldirish so'rovi (chek hali yo'q) — pul qo'shilmaydi ----
    let topUps = 0;
    const first = customers[0];
    if (!(await prisma.topUp.count({ where: { userId: first.id } }))) {
      const t = await prisma.topUp.create({ data: { userId: first.id, amount: 50000, method: TopUpMethod.MANUAL_CARD, code: `TMP-${first.id}-${Date.now()}` } });
      await prisma.topUp.update({ where: { id: t.id }, data: { code: `TOP-${String(t.id).padStart(6, '0')}` } });
      topUps++;
    }

    console.log(`Buyurtmalar: +${orders}, zaxira: +${inventory}, to'ldirish so'rovi: +${topUps}, karta: ${manual ? 'avvaldan bor' : "qo'shildi"}`);
    console.log(created.length ? `Yangi dev hisoblar (telefon / parol):\n  ${created.join('\n  ')}` : 'Hisoblar avvaldan bor (parollar o‘zgartirilmadi).');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
