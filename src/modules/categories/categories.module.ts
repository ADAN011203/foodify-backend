// RUTA: src/modules/categories/categories.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService }    from './categories.service';
import { MenuCategory }         from './entities/menu-category.entity';
import { Menu }                 from '../menus/entities/menu.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([MenuCategory, Menu])],
  controllers: [CategoriesController],
  providers:   [CategoriesService],
  exports:     [CategoriesService],
})
export class CategoriesModule {}

