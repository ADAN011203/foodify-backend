// RUTA: src/modules/users/users.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController }       from './users.controller';
import { UsersCompatController } from './users-compat.controller';
import { UsersService }          from './users.service';
import { User }                  from './entities/user.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, UsersCompatController],
  providers:   [UsersService],
  exports:     [UsersService],
})
export class UsersModule {}
