import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramOutboxService } from '../telegram/telegram-outbox.service';
import { ROLE_LABEL } from './audit.service';

export interface StatusChange {
  orderId: number;
  from: OrderStatus | null;
  to: OrderStatus;
  actor: AuthUser | null; // null — tizim (masalan to'lov muddati tugashi)
  note?: string | null;
}

/** Buyurtma holati tarixi — har o'tishda bitta yozuv (operator, sex va mijoz ko'radigan timeline shundan) */
@Injectable()
export class OrderHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramOutboxService,
  ) {}

  async record(change: StatusChange, db: Prisma.TransactionClient = this.prisma) {
    let actorName = 'Tizim';
    let actorRole = 'Tizim';
    if (change.actor) {
      const user = await db.user.findUnique({ where: { id: change.actor.id }, select: { fullName: true, workshopName: true } });
      actorName = user?.workshopName || user?.fullName || `#${change.actor.id}`;
      actorRole = ROLE_LABEL[change.actor.role] ?? change.actor.role;
    }
    const log = await db.orderStatusLog.create({
      data: {
        orderId: change.orderId,
        fromStatus: change.from,
        toStatus: change.to,
        actorId: change.actor?.id,
        actorName,
        actorRole,
        note: change.note || null,
      },
    });
    // Mijoz botga ulangan bo'lsa — holat xabari shu tranzaksiyada navbatga qo'yiladi
    await this.telegram.enqueueOrderStatus(db, change.orderId, change.to, log.id);
  }
}
