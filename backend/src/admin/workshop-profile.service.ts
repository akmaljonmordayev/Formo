import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateWorkshopProfileDto } from './dto/workshop-panel.dto';

const profileSelect = {
  id: true,
  phone: true,
  fullName: true,
  workshopName: true,
  address: true,
  dailyCapacity: true,
  shiftStart: true,
  shiftEnd: true,
} as const;

/** Sexning o'z profili va xodimlari. Kunlik sig'im (dailyCapacity) faqat Superadmin tomonidan belgilanadi. */
@Injectable()
export class WorkshopProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  profile(workshop: AuthUser) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: workshop.id }, select: profileSelect });
  }

  async updateProfile(workshop: AuthUser, dto: UpdateWorkshopProfileDto, ip?: string) {
    const updated = await this.prisma.user.update({ where: { id: workshop.id }, data: dto, select: profileSelect });
    await this.audit.log({ actor: workshop, action: 'Sex profili yangilandi', category: AuditCategory.USER, context: updated.workshopName ?? updated.fullName, ip });
    return updated;
  }

  listEmployees(workshop: AuthUser) {
    return this.prisma.employee.findMany({ where: { workshopId: workshop.id }, orderBy: { id: 'asc' } });
  }

  createEmployee(workshop: AuthUser, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({ data: { ...dto, workshopId: workshop.id } });
  }

  async updateEmployee(workshop: AuthUser, id: number, dto: UpdateEmployeeDto) {
    await this.own(workshop, id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async removeEmployee(workshop: AuthUser, id: number) {
    await this.own(workshop, id);
    await this.prisma.employee.delete({ where: { id } });
    return { id };
  }

  private async own(workshop: AuthUser, id: number) {
    const e = await this.prisma.employee.findFirst({ where: { id, workshopId: workshop.id }, select: { id: true } });
    if (!e) throw new NotFoundException('Xodim topilmadi');
  }
}
