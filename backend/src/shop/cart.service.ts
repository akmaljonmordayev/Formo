import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Promocode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { visibleClub } from './catalog.service';
import { DeliveryService } from './delivery.service';
import { AddCartItemDto, MAX_ITEM_QTY, UpdateCartItemDto } from './dto/cart.dto';
import { promoError, summarize, unitPrice } from './pricing';

export const MAX_CART_LINES = 20;

type Db = PrismaService | Prisma.TransactionClient;

const lineInclude = {
  kit: {
    include: {
      club: {
        select: {
          id: true,
          name: true,
          code: true,
          markColor: true,
          isActive: true,
          category: { select: { isActive: true } },
        },
      },
    },
  },
} satisfies Prisma.CartItemInclude;

export type CartLine = Prisma.CartItemGetPayload<{ include: typeof lineInclude }>;

interface Config {
  printName: string | null;
  printNumber: string | null;
  numberOnShorts: boolean;
  withShorts: boolean;
  shirtSize: string;
  shortsSize: string | null;
}

/** Savat qatori hozir ham sotib olinadimi (forma o'chirilmagan, o'lcham tugamagan) */
export function lineProblem(line: CartLine): string | null {
  const { kit } = line;
  if (!kit.isActive || !kit.club.isActive || kit.club.category?.isActive === false) return 'Forma sotuvda emas';
  if (!kit.sizes.includes(line.shirtSize)) return `Futbolka ${line.shirtSize} o'lchami tugagan`;
  if (line.withShorts && (!line.shortsSize || !kit.sizes.includes(line.shortsSize))) {
    return `Shortik ${line.shortsSize} o'lchami tugagan`;
  }
  return null;
}

export function toCartItem(line: CartLine) {
  const { kit } = line;
  const price = unitPrice(kit, line);
  const problem = lineProblem(line);
  const print = [line.printName, line.printNumber].filter(Boolean).join(' · ');
  const sizes = line.withShorts ? `${line.shirtSize} / ${line.shortsSize}` : line.shirtSize;
  return {
    id: line.id,
    kitId: kit.id,
    club: { id: kit.club.id, name: kit.club.name, code: kit.club.code, markColor: kit.club.markColor },
    kit: { label: kit.label, bgColor: kit.bgColor, textColor: kit.textColor },
    title: `${kit.club.name} · ${kit.label} formasi`,
    subtitle: [print, sizes].filter(Boolean).join(' · '),
    printName: line.printName,
    printNumber: line.printNumber,
    numberOnShorts: line.numberOnShorts,
    withShorts: line.withShorts,
    shirtSize: line.shirtSize,
    shortsSize: line.shortsSize,
    quantity: line.quantity,
    unitPrice: price,
    totalPrice: price * line.quantity,
    available: !problem,
    problem,
  };
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
  ) {}

  lines(userId: number, db: Db = this.prisma) {
    return db.cartItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, include: lineInclude });
  }

  /** Promokodni topib, shu summa uchun yaroqliligini tekshiradi — aks holda 400 */
  async resolvePromo(code: string, subtotal: number, db: Db = this.prisma): Promise<Promocode> {
    const promo = await db.promocode.findUnique({ where: { code } });
    const error = promoError(promo, subtotal);
    if (error) throw new BadRequestException(error);
    return promo as Promocode;
  }

  async view(userId: number, promocode?: string) {
    const items = (await this.lines(userId)).map(toCartItem);
    const subtotal = items.filter((i) => i.available).reduce((s, i) => s + i.totalPrice, 0);
    const promo = promocode ? await this.resolvePromo(promocode, subtotal) : null;
    const summary = summarize(subtotal, await this.delivery.fee(), promo);

    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      promocode: promo && { code: promo.code, type: promo.type, value: promo.value },
      summary,
    };
  }

  private async assertKit(kitId: number) {
    const kit = await this.prisma.kit.findFirst({ where: { id: kitId, isActive: true, club: visibleClub } });
    if (!kit) throw new NotFoundException('Forma topilmadi');
    return kit;
  }

  /** O'lcham/shortik sozlamalarini tekshiradi va saqlanadigan ko'rinishga keltiradi */
  private normalize(sizes: string[], c: Config): Config {
    if (!sizes.includes(c.shirtSize)) throw new BadRequestException(`Futbolka ${c.shirtSize} o'lchami mavjud emas`);
    if (c.withShorts) {
      const shortsSize = c.shortsSize ?? c.shirtSize;
      if (!sizes.includes(shortsSize)) throw new BadRequestException(`Shortik ${shortsSize} o'lchami mavjud emas`);
      return { ...c, shortsSize };
    }
    return { ...c, shortsSize: null, numberOnShorts: false };
  }

  async add(userId: number, dto: AddCartItemDto) {
    const kit = await this.assertKit(dto.kitId);
    const config = this.normalize(kit.sizes, {
      printName: dto.printName ?? null,
      printNumber: dto.printNumber ?? null,
      numberOnShorts: dto.numberOnShorts ?? false,
      withShorts: dto.withShorts ?? true,
      shirtSize: dto.shirtSize,
      shortsSize: dto.shortsSize ?? null,
    });
    const quantity = dto.quantity ?? 1;

    // Aynan shu sozlamadagi forma savatda bo'lsa — yangi qator emas, soni oshiriladi
    const same = await this.prisma.cartItem.findFirst({ where: { userId, kitId: kit.id, ...config } });
    if (same) {
      await this.prisma.cartItem.update({
        where: { id: same.id },
        data: { quantity: Math.min(same.quantity + quantity, MAX_ITEM_QTY) },
      });
    } else {
      const count = await this.prisma.cartItem.count({ where: { userId } });
      if (count >= MAX_CART_LINES) throw new BadRequestException(`Savatda ${MAX_CART_LINES} tadan ortiq mahsulot bo'lmaydi`);
      await this.prisma.cartItem.create({ data: { userId, kitId: kit.id, ...config, quantity } });
    }
    return this.view(userId);
  }

  async update(userId: number, id: number, dto: UpdateCartItemDto) {
    const line = await this.prisma.cartItem.findFirst({ where: { id, userId }, include: { kit: true } });
    if (!line) throw new NotFoundException('Savatda bunday mahsulot yo‘q');

    const config = this.normalize(line.kit.sizes, {
      printName: dto.printName !== undefined ? dto.printName : line.printName,
      printNumber: dto.printNumber !== undefined ? dto.printNumber : line.printNumber,
      numberOnShorts: dto.numberOnShorts ?? line.numberOnShorts,
      withShorts: dto.withShorts ?? line.withShorts,
      shirtSize: dto.shirtSize ?? line.shirtSize,
      // Shortik qayta qo'shilsa va o'lchami berilmasa — futbolka o'lchami olinadi
      shortsSize: dto.shortsSize ?? line.shortsSize,
    });
    await this.prisma.cartItem.update({
      where: { id },
      data: { ...config, ...(dto.quantity !== undefined && { quantity: dto.quantity }) },
    });
    return this.view(userId);
  }

  async remove(userId: number, id: number) {
    const { count } = await this.prisma.cartItem.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Savatda bunday mahsulot yo‘q');
    return this.view(userId);
  }

  async clear(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return this.view(userId);
  }
}
