/**
 * RUTA: src/modules/kitchen/kitchen.module.ts
 */
import { Module, forwardRef }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule }     from '@nestjs/jwt';

import { KitchenController } from './kitchen.controller';
import { KitchenService }    from './kitchen.service';
import { KitchenGateway }    from './kitchen.gateway';
import { KitchenSession }    from './entities/kitchen-session.entity';
import { Order }             from '../orders/entities/order.entity';
import { OrderItem }         from '../orders/entities/order-item.entity';
import { DishesModule }      from '../dishes/dishes.module';
import { RecipesModule }     from '../recipes/recipes.module';
import { OrdersModule }      from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, KitchenSession]),
    JwtModule,
    DishesModule,
    RecipesModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [KitchenController],
  providers:   [KitchenService, KitchenGateway],
  exports:     [KitchenService, KitchenGateway],
})
export class KitchenModule {}
