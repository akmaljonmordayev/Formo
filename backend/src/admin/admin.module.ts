import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountsService } from './accounts.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { DiagnosticsController } from './diagnostics.controller';
import { InsightsController } from './insights.controller';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { OperatorController } from './operator.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PromocodesController } from './promocodes.controller';
import { PromocodesService } from './promocodes.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UsersController } from './users.controller';
import { WorkshopsController } from './workshops.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    OperatorController,
    WorkshopsController,
    UsersController,
    DiagnosticsController,
    CategoriesController,
    ClubsController,
    OrdersController,
    InsightsController,
    InventoryController,
    PricingController,
    PromocodesController,
    CampaignsController,
    AuditController,
    SettingsController,
  ],
  providers: [
    AccountsService,
    AuditService,
    CategoriesService,
    ClubsService,
    OrdersService,
    InventoryService,
    PricingService,
    PromocodesService,
    CampaignsService,
    SettingsService,
  ],
})
export class AdminModule {}
