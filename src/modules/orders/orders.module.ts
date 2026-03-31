/**
 * RUTA: src/modules/orders/orders.module.ts
 */
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService }    from './orders.service';
import { OrdersGateway }    from './orders.gateway';
import { Order }            from './entities/order.entity';
import { OrderItem }        from './entities/order-item.entity';
import { Dish }             from '../dishes/entities/dish.entity';
import { AuthModule }       from '../auth/auth.module';

@Module({
  imports:     [
    TypeOrmModule.forFeature([Order, OrderItem, Dish]),
    AuthModule,
  ],
  controllers: [OrdersController],
  providers:   [OrdersService, OrdersGateway],
  exports:     [OrdersService, OrdersGateway],
})
export class OrdersModule {}
