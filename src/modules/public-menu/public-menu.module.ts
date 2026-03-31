/**
 * RUTA: src/modules/public-menu/public-menu.module.ts
 */
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicMenuController } from './public-menu.controller';
import { PublicMenuService }    from './public-menu.service';
import { Restaurant }           from '../restaurants/entities/restaurant.entity';
import { Order }                from '../orders/entities/order.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Restaurant, Order])],
  controllers: [PublicMenuController],
  providers:   [PublicMenuService],
})
export class PublicMenuModule {}
