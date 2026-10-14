import { Injectable } from '@nestjs/common';
import { AuditCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListAuditLogQueryDto } from './dto/audit.dto';

export interface AuditEntry {
  actor: AuthUser | null; // null — tizim (masalan navbat ishi) yozgan amal
  action: string;
  category: AuditCategory;
  context?: string;
  ip?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: 'Super admin',
  OPERATOR: 'Operator',
  TAILOR: 'Tikuv sexi',
  USER: 'Foydalanuvchi',
};

/**
 * Audit jurnali: append-only. Yozuvni o'zgartiradigan yoki o'chiradigan endpoint ataylab yo'q —
 * "Audit jurnali" sahifasidagi "yozuvlarni o'zgartirib ham, o'chirib ham bo'lmaydi" shu yerda ta'minlanadi.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    let actorName = 'Tizim (BullMQ)';
    let actorRole = 'Tizim';

    if (entry.actor) {
      const user = await this.prisma.user.findUnique({
        where: { id: entry.actor.id },
        select: { fullName: true },
      });
      actorName = user?.fullName ?? `#${entry.actor.id}`;
      actorRole = ROLE_LABEL[entry.actor.role] ?? entry.actor.role;
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actor?.id,
        actorName,
        actorRole,
        action: entry.action,
        category: entry.category,
        context: entry.context,
        ip: entry.ip ?? undefined,
      },
    });
  }

  async list(query: ListAuditLogQueryDto) {
    const { search, category, page = 1, limit = 50 } = query;
    const where: Prisma.AuditLogWhereInput = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: 'insensitive' } },
        { context: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
