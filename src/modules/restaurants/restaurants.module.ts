// RUTA: src/modules/restaurants/restaurants.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule }  from '@nestjs/platform-express';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService }    from './restaurants.service';
import { Restaurant }            from './entities/restaurant.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Restaurant]), MulterModule.register({ limits: { fileSize: 2 * 1024 * 1024 } })],
  controllers: [RestaurantsController],
  providers:   [RestaurantsService],
  exports:     [RestaurantsService],
})
export class RestaurantsModule {}
