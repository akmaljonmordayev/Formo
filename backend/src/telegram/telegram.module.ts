import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RulesService } from '../shop/rules.service';
import { InternalTokenGuard } from './internal-token.guard';
import { TelegramAccountService } from './telegram-account.service';
import { TelegramAuthController } from './telegram-auth.controller';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramInternalController } from './telegram-internal.controller';
import { TelegramOutboxService } from './telegram-outbox.service';

/** Telegram bot integratsiyasi: kirish (ilova + bot) va foydalanuvchi xabarlari navbati */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [TelegramAuthController, TelegramInternalController],
  providers: [TelegramAuthService, TelegramOutboxService, TelegramAccountService, RulesService, InternalTokenGuard],
  exports: [TelegramOutboxService],
})
export class TelegramModule {}
