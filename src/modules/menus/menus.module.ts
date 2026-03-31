// RUTA: src/modules/menus/menus.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenusController } from './menus.controller';
import { MenusService }    from './menus.service';
import { Menu }            from './entities/menu.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Menu])],
  controllers: [MenusController],
  providers:   [MenusService],
  exports:     [MenusService],
})
export class MenusModule {}
