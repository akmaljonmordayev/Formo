import { Module } from '@nestjs/common';
import { AuditService } from '../admin/audit.service';
import { OrderHistoryService } from '../admin/order-history.service';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { DeliveryService } from './delivery.service';
import { ShopOrdersController } from './orders.controller';
import { ShopOrdersService } from './orders.service';

/** Mobil ilova: katalog → savat → rasmiylashtirish → to'lov → buyurtmalar */
@Module({
  controllers: [CatalogController, CartController, AddressesController, ShopOrdersController],
  providers: [
    CatalogService,
    CartService,
    AddressesService,
    DeliveryService,
    ShopOrdersService,
    AuditService,
    OrderHistoryService,
  ],
})
export class ShopModule {}
