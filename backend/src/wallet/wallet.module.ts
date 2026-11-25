import { Global, Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

/** Balans va oldingi harakatlar tarixini o'qish; yangi to'ldirish yo'llari o'chirilgan */
@Global()
@Module({
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
