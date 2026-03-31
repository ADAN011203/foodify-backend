// RUTA: src/modules/menus/menus.controller.ts
// BASE: /api/v1/menus
// PLATAFORMA: PWA (restaurant_admin) — Plan Básico y Premium
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { MenusService } from './menus.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles, Role }  from '../../shared/decorators/roles.decorator';
import { RestaurantId } from '../../shared/decorators/current-user.decorator';
import { CreateMenuDto } from './dto/menu.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('menus')
export class MenusController {
  constructor(private readonly svc: MenusService) {}
  @Get()    findAll(@RestaurantId() rid: number) { return this.svc.findAll(rid); }
  @Get(':id') findOne(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number) { return this.svc.findOne(id, rid); }
  @Post()   create(@RestaurantId() rid: number, @Body() dto: CreateMenuDto) { return this.svc.create(rid, dto); }
  @Put(':id') update(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number, @Body() dto: CreateMenuDto) { return this.svc.update(id, rid, dto); }
  @Patch(':id/status') updateStatus(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number, @Body('isActive') isActive: boolean) { return this.svc.updateStatus(id, rid, isActive); }
  @Delete(':id') remove(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number) { return this.svc.remove(id, rid); }
  @Get(':id/categories') getCategories(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number) { return this.svc.getCategories(id, rid); }
}
