// RUTA: src/modules/users/users.controller.ts
// PLATAFORMA: PWA (restaurant_admin) + App Android Premium
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles, Role }  from '../../shared/decorators/roles.decorator';
import { RestaurantId } from '../../shared/decorators/current-user.decorator';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}
  @Get()    findAll(@RestaurantId() rid: number) { return this.svc.findAll(rid); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }
  @Post()   create(@RestaurantId() rid: number, @Body() dto: CreateUserDto) { return this.svc.create(rid, dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
