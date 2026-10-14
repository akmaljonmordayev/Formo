import { Injectable } from '@nestjs/common';
import { AuditCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntry, AuditService } from './audit.service';

/** Delivery slotlari kabi boshlang'ich sozlamalar — birinchi so'rovda hali yozuv bo'lmasa shu qaytariladi */
const DEFAULTS: Record<string, Prisma.JsonValue> = {
  'delivery.slots': [
    { start: '10:00', end: '14:00', cap: 50, on: true },
    { start: '14:00', end: '18:00', cap: 50, on: true },
    { start: '18:00', end: '22:00', cap: 30, on: true },
  ],
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async all() {
    const rows = await this.prisma.setting.findMany();
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { ...DEFAULTS, ...byKey };
  }

  async update(key: string, value: unknown, actor: AuditEntry['actor'], ip?: string) {
    const setting = await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });

    await this.audit.log({
      actor,
      action: "Sozlama saqlandi",
      category: AuditCategory.SETTING,
      context: key,
      ip,
    });

    return setting;
  }
}
