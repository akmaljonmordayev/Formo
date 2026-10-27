import { Module } from '@nestjs/common';
import { AuditService } from '../admin/audit.service';
import { StorageService } from '../storage/storage.service';
import { AdminKitDesignsController } from './admin-kit-designs.controller';
import { KitDesignsController } from './kit-designs.controller';
import { KitDesignsService } from './kit-designs.service';

/** 3D forma dizaynlari: Superadmin tahrirlovchisi (CRUD, rasm yuklash) va mobil ilova uchun ochiq ro'yxat */
@Module({
  controllers: [AdminKitDesignsController, KitDesignsController],
  providers: [KitDesignsService, StorageService, AuditService],
})
export class KitsModule {}
