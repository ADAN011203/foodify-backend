/**
 * RUTA: src/modules/kitchen/kitchen.module.ts
 */
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule }     from '@nestjs/jwt';

import { KitchenController } from './kitchen.controller';
import { KitchenService }    from './kitchen.service';
import { KitchenGateway }    from './kitchen.gateway';
import { KitchenSession }    from './entities/kitchen-session.entity';
import { Order }             from '../orders/entities/order.entity';
import { OrderItem }         from '../orders/entities/order-item.entity';
import { OrdersGateway }     from '../orders/orders.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, KitchenSession]),
    JwtModule,
  ],
  controllers: [KitchenController],
  providers:   [KitchenService, KitchenGateway, OrdersGateway],
  exports:     [KitchenService, KitchenGateway],
})
export class KitchenModule {}
