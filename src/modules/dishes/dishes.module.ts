// RUTA: src/modules/dishes/dishes.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule }  from '@nestjs/platform-express';
import { DishesController }       from './dishes.controller';
import { DishesCompatController }  from './dishes-compat.controller';
import { DishesService }           from './dishes.service';
import { Dish }                    from './entities/dish.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Dish]), MulterModule.register({ limits: { fileSize: 5*1024*1024 } })],
  controllers: [DishesController, DishesCompatController],
  providers:   [DishesService],
  exports:     [DishesService],
})
export class DishesModule {}
