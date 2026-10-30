import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { KitsModule } from './kits/kits.module';
import { RolesGuard } from './common/guards/roles.guard';
import { NotifyModule } from './notify/notify.module';
import { PrismaModule } from './prisma/prisma.module';
import { ShopModule } from './shop/shop.module';
import { TelegramModule } from './telegram/telegram.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    // Productionda dev parol/secret bilan ishga tushish taqiqlangan (config/env.validation.ts)
    // Testlar (jest NODE_ENV=test) dasturchining backend/.env faylini o'qimaydi — real tokenlar
    // test natijasiga ta'sir qilmasin va testlarga sizib chiqmasin
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, ignoreEnvFile: process.env.NODE_ENV === 'test' }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.THROTTLE_LIMIT ?? 120) }]),
    PrismaModule,
    NotifyModule,
    TelegramModule,
    WalletModule,
    AuthModule,
    AdminModule,
    ShopModule,
    KitsModule,
    HealthModule,
  ],
  providers: [
    // Tartib muhim: avval rate-limit, keyin JWT (hamma endpoint himoyalangan, @Public dan tashqari), keyin rol
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
