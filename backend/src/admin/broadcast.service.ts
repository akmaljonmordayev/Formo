import { Injectable } from '@nestjs/common';
import { AuditCategory } from '@prisma/client';
import { TelegramOutboxService } from '../telegram/telegram-outbox.service';
import { AuditEntry, AuditService } from './audit.service';

/** Admin panelidan botga ulangan barcha mijozlarga bir martalik Telegram xabari */
@Injectable()
export class BroadcastService {
  constructor(
    private readonly outbox: TelegramOutboxService,
    private readonly audit: AuditService,
  ) {}

  recipients() {
    return this.outbox.linkedCount().then((count) => ({ count }));
  }

  async send(message: string, actor: AuditEntry['actor'], ip?: string) {
    const { sent } = await this.outbox.enqueueBroadcast(message);

    await this.audit.log({
      actor,
      action: 'Telegram xabari barcha foydalanuvchilarga yuborildi',
      category: AuditCategory.SYSTEM,
      context: `${sent} kishiga: ${message.slice(0, 120)}`,
      ip,
    });

    return { sent };
  }
}
