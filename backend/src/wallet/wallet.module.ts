import { Global, Module } from '@nestjs/common';
import { AuditService } from '../admin/audit.service';
import { AdminTopUpsController } from './admin-topups.controller';
import { ClickService } from './click.service';
import { PaymentsController } from './payments.controller';
import { PaymeService } from './payme.service';
import { TopUpsService } from './topups.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

/** Ichki balans: daftar, to'ldirish (qo'lda / Click / Payme) va admin tasdig'i */
@Global()
@Module({
  controllers: [WalletController, AdminTopUpsController, PaymentsController],
  providers: [WalletService, TopUpsService, ClickService, PaymeService, AuditService],
  exports: [WalletService, TopUpsService],
})
export class WalletModule {}
