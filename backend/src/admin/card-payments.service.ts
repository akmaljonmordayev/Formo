import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';
import { OrdersService } from './orders.service';

@Injectable()
export class CardPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
  ) {}

  /**
   * Mijoz admin bergan karta raqamiga pul o'tkazdi — buyurtma to'langan bo'ladi. Holat o'zgarmaydi (NEW):
   * keyin admin sexni tanlaydi (assign) va buyurtma "Kartadan to'lovchilar" navbatidan chiqadi.
   * Faqat NEW holatda: bekor qilingan (shu jumladan 24 soatda avtomatik) buyurtma "to'landi" bo'lmaydi.
   */
  async markPaid(id: number, actor: NonNullable<AuditEntry['actor']>, ip?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true, code: true, paymentMethod: true, paymentStatus: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    if (order.paymentMethod !== PaymentMethod.CARD) throw new ConflictException("Bu buyurtma kartadan to'lov usulida emas");
    if (order.paymentStatus === PaymentStatus.PAID) return this.orders.get(id);
    if (order.status !== OrderStatus.NEW) {
      throw new ConflictException("Faqat yangi (sexga yuborilmagan, bekor qilinmagan) buyurtmani to'landi deb belgilash mumkin");
    }
    // Shartli: shu orada mijoz bekor qilgan yoki muddat tugab bekor bo'lgan bo'lsa — yozilmaydi.
    // Holat tarixiga yozilmaydi (holat o'zgarmaydi) — to'lov vaqti paidAt'da, kim tasdiqlagani audit jurnalida
    const { count } = await this.prisma.order.updateMany({
      where: { id, paymentMethod: PaymentMethod.CARD, paymentStatus: PaymentStatus.PENDING, status: OrderStatus.NEW },
      data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date() },
    });
    if (!count) throw new ConflictException("Buyurtma shu orada o'zgardi — sahifani yangilang");
    await this.audit.log({ actor, action: "Kartadan to'lov tasdiqlandi", category: AuditCategory.PAYMENT, context: order.code, ip });
    return this.orders.get(id);
  }
}
