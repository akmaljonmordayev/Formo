import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Promocode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { visibleClub } from './catalog.service';
import { DeliveryService } from './delivery.service';
import { AddCartItemDto, MAX_ITEM_QTY, UpdateCartItemDto } from './dto/cart.dto';
import { RulesService } from './rules.service';
import { ALL_SIZES, KitPrices, loadKitDesignPrices, promoError, summarize, unitPrice } from './pricing';
import { CUSTOM_TITLE, Design, designSummary, StudioPrices, studioPrice } from './studio';
import { StudioService } from './studio.service';
import { KIT_DESIGN_TITLE, toDesignV1 } from '../kits/kit-design';

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
          kit360Id: true,
          category: { select: { isActive: true } },
        },
      },
    },
  },
  kitDesign: true,
} satisfies Prisma.CartItemInclude;

export type CartLine = Prisma.CartItemGetPayload<{ include: typeof lineInclude }>;

/** Savat narxlari serverdagi jadvallardan: maxsus dizayn (studio.*) va 3D dizayn (club.*) */
export interface CartPrices {
  studio: StudioPrices;
  kitDesign: KitPrices;
}

interface Config {
  printName: string | null;
  printNumber: string | null;
  numberOnShorts: boolean;
  shortsNumber: string | null;
  withShorts: boolean;
  shirtSize: string;
  shortsSize: string | null;
}

/** Savat qatori hozir ham sotib olinadimi (forma o'chirilmagan, o'lcham tugamagan) */
export function lineProblem(line: CartLine): string | null {
  const { kit } = line;
  if (line.kitDesignId) {
    if (!line.kitDesign?.isActive) return 'Dizayn sotuvda emas';
    if (!ALL_SIZES.includes(line.shirtSize)) return `Futbolka ${line.shirtSize} o'lchami tugagan`;
    if (line.withShorts && (!line.shortsSize || !ALL_SIZES.includes(line.shortsSize))) return `Shortik ${line.shortsSize} o'lchami tugagan`;
    return null;
  }
  if (!kit) {
    if (!ALL_SIZES.includes(line.shirtSize)) return `Futbolka ${line.shirtSize} o'lchami tugagan`;
    if (line.withShorts && (!line.shortsSize || !ALL_SIZES.includes(line.shortsSize))) return `Shortik ${line.shortsSize} o'lchami tugagan`;
    return null;
  }
  if (!kit.isActive || !kit.club.isActive || kit.club.category?.isActive === false) return 'Forma sotuvda emas';
  if (!kit.sizes.includes(line.shirtSize)) return `Futbolka ${line.shirtSize} o'lchami tugagan`;
  if (line.withShorts && (!line.shortsSize || !kit.sizes.includes(line.shortsSize))) {
    return `Shortik ${line.shortsSize} o'lchami tugagan`;
  }
  return null;
}

/** Qator narxi faqat server jadvallaridan: klub formasi — o'z narxi, 3D dizayn — club.*, maxsus — studio.* */
function linePrice(line: CartLine, prices: CartPrices) {
  if (line.kit) return unitPrice(line.kit, line);
  if (line.kitDesignId) return unitPrice(prices.kitDesign, line);
  return studioPrice(line.design as unknown as Design, prices.studio, line.withShorts);
}

export function toCartItem(line: CartLine, prices: CartPrices) {
  const { kit, kitDesign } = line;
  const design = (line.design as unknown as Design | null) ?? null;
  const price = linePrice(line, prices);
  const problem = lineProblem(line);
  const print = [line.printName, line.printNumber].filter(Boolean).join(' · ');
  const sizes = line.withShorts ? `${line.shirtSize} / ${line.shortsSize}` : line.shirtSize;
  const title = kit
    ? `${kit.club.name} · ${kit.label} formasi`
    : kitDesign
      ? `${kitDesign.name} · ${KIT_DESIGN_TITLE}`
      : `${CUSTOM_TITLE} futbolka`;
  return {
    id: line.id,
    kitId: kit?.id ?? null,
    club: kit
      ? { id: kit.club.id, name: kit.club.name, code: kit.club.code, markColor: kit.club.markColor, kit360Id: kit.club.kit360Id }
      : null,
    kit: kit ? { label: kit.label, bgColor: kit.bgColor, textColor: kit.textColor } : null,
    kitDesignId: line.kitDesignId,
    kitDesign: kitDesign ? { id: kitDesign.id, name: kitDesign.name, thumbnailUrl: kitDesign.thumbnailUrl, design: toDesignV1(kitDesign) } : null,
    design,
    designSummary: design ? designSummary(design) : null,
    title,
    subtitle: [print, sizes].filter(Boolean).join(' · '),
    printName: line.printName,
    printNumber: line.printNumber,
    numberOnShorts: line.numberOnShorts,
    shortsNumber: line.shortsNumber,
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
    private readonly rules: RulesService,
    private readonly studio: StudioService,
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

  prices(db: Db = this.prisma): Promise<CartPrices> {
    return Promise.all([this.studio.prices(db), loadKitDesignPrices(db)]).then(([studio, kitDesign]) => ({ studio, kitDesign }));
  }

  async view(userId: number, promocode?: string) {
    const [lines, prices] = await Promise.all([this.lines(userId), this.prices()]);
    const items = lines.map((l) => toCartItem(l, prices));
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
      // Shortik raqami faqat "shortikka raqam" yoqilgan bo'lsa; berilmasa futbolka raqami
      const shortsNumber = c.numberOnShorts ? (c.shortsNumber ?? c.printNumber) : null;
      return { ...c, shortsSize, numberOnShorts: c.numberOnShorts && shortsNumber !== null, shortsNumber };
    }
    return { ...c, shortsSize: null, numberOnShorts: false, shortsNumber: null };
  }

  private async assertKitDesign(id: number) {
    const design = await this.prisma.kitDesign.findFirst({ where: { id, isActive: true }, select: { id: true } });
    if (!design) throw new NotFoundException('Dizayn topilmadi yoki sotuvda emas');
    return design;
  }

  async add(userId: number, dto: AddCartItemDto) {
    // Uch xil mahsulot: klub formasi (kitId), maxsus futbolka (design) yoki Superadmin 3D dizayni (kitDesignId)
    const custom = dto.design !== undefined;
    const kinds = [dto.kitId != null, custom, dto.kitDesignId != null].filter(Boolean).length;
    if (kinds !== 1) {
      throw new BadRequestException('Klub formasi (kitId), maxsus dizayn (design) yoki 3D dizayn (kitDesignId) dan faqat bittasini yuboring');
    }
    const kit = dto.kitId != null ? await this.assertKit(dto.kitId) : null;
    const kitDesign = dto.kitDesignId != null ? await this.assertKitDesign(dto.kitDesignId) : null;
    const design = custom ? ((await this.studio.validate(dto.design)) as unknown as Prisma.InputJsonObject) : null;

    const config = this.normalize(kit ? kit.sizes : [...ALL_SIZES], {
      printName: dto.printName ?? null,
      printNumber: dto.printNumber ?? null,
      numberOnShorts: dto.numberOnShorts ?? false,
      shortsNumber: dto.shortsNumber ?? null,
      // Maxsus va 3D dizaynda shortik ixtiyoriy (standart — yo'q), klub formasida standart — bor
      withShorts: dto.withShorts ?? Boolean(kit),
      shirtSize: dto.shirtSize,
      shortsSize: dto.shortsSize ?? null,
    });
    const quantity = dto.quantity ?? 1;
    await this.rules.assertAccepting();
    await this.rules.assertLine({ ...config, quantity });

    // Aynan shu sozlamadagi mahsulot savatda bo'lsa — yangi qator emas, soni oshiriladi
    const same = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        kitId: kit?.id ?? null,
        kitDesignId: kitDesign?.id ?? null,
        ...config,
        design: design ? { equals: design } : { equals: Prisma.DbNull },
      },
    });
    if (same) {
      await this.prisma.cartItem.update({
        where: { id: same.id },
        data: { quantity: Math.min(same.quantity + quantity, MAX_ITEM_QTY, (await this.rules.rules()).maxQtyPerItem) },
      });
    } else {
      const count = await this.prisma.cartItem.count({ where: { userId } });
      if (count >= MAX_CART_LINES) throw new BadRequestException(`Savatda ${MAX_CART_LINES} tadan ortiq mahsulot bo'lmaydi`);
      await this.rules.assertLineCount(count);
      await this.prisma.cartItem.create({
        data: { userId, kitId: kit?.id ?? null, kitDesignId: kitDesign?.id ?? null, ...config, quantity, ...(design && { design }) },
      });
    }
    return this.view(userId);
  }

  async update(userId: number, id: number, dto: UpdateCartItemDto) {
    const line = await this.prisma.cartItem.findFirst({ where: { id, userId }, include: { kit: true } });
    if (!line) throw new NotFoundException('Savatda bunday mahsulot yo‘q');

    const config = this.normalize(line.kit ? line.kit.sizes : [...ALL_SIZES], {
      printName: dto.printName !== undefined ? dto.printName : line.printName,
      printNumber: dto.printNumber !== undefined ? dto.printNumber : line.printNumber,
      numberOnShorts: dto.numberOnShorts ?? line.numberOnShorts,
      shortsNumber: dto.shortsNumber !== undefined ? dto.shortsNumber : line.shortsNumber,
      withShorts: dto.withShorts ?? line.withShorts,
      shirtSize: dto.shirtSize ?? line.shirtSize,
      // Shortik qayta qo'shilsa va o'lchami berilmasa — futbolka o'lchami olinadi
      shortsSize: dto.shortsSize ?? line.shortsSize,
    });
    await this.rules.assertLine({ ...config, quantity: dto.quantity });
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
