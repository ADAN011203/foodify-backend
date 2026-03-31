// RUTA: src/modules/tables/tables.controller.ts
// PLATAFORMA: PWA (restaurant_admin) + App Android (waiter — lectura)
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard }  from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }    from '../../shared/guards/roles.guard';
import { Roles, Role }   from '../../shared/decorators/roles.decorator';
import { RestaurantId }  from '../../shared/decorators/current-user.decorator';
import { TableStatus }   from './entities/table.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly svc: TablesService) {}
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER)
  @Get() findAll(@RestaurantId() rid: number) { return this.svc.findAll(rid); }
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER)
  @Get(':id') findOne(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number) { return this.svc.findOne(id, rid); }
  @Roles(Role.RESTAURANT_ADMIN)
  @Post() create(@RestaurantId() rid: number, @Body() dto: { number: number; capacity?: number }) { return this.svc.create(rid, dto); }
  @Roles(Role.RESTAURANT_ADMIN)
  @Put(':id') update(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number, @Body() dto: any) { return this.svc.update(id, rid, dto); }
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER)
  @Patch(':id/status') updateStatus(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number, @Body('status') status: TableStatus) { return this.svc.updateStatus(id, rid, status); }
  @Roles(Role.RESTAURANT_ADMIN)
  @Delete(':id') remove(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number) { return this.svc.remove(id, rid); }
}
