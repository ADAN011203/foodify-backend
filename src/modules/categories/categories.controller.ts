// RUTA: src/modules/categories/categories.controller.ts
// BASE: /api/v1/menus/:menuId/categories  (anidado bajo menus)
// PLATAFORMA: PWA (restaurant_admin) + App Android Premium (waiter/chef consultan categorías)
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles, Role }  from '../../shared/decorators/roles.decorator';
import { CreateCategoryDto } from './dto/category.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menus/:menuId/categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER, Role.CHEF)
  @Get()
  findAll(@Param('menuId',ParseIntPipe) menuId: number) { return this.svc.findByMenu(menuId); }

  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER, Role.CHEF)
  @Get(':id')
  findOne(@Param('id',ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Roles(Role.RESTAURANT_ADMIN)
  @Post()
  create(@Param('menuId',ParseIntPipe) menuId: number, @Body() dto: CreateCategoryDto) { return this.svc.create(menuId, dto); }

  @Roles(Role.RESTAURANT_ADMIN)
  @Put(':id')
  update(@Param('id',ParseIntPipe) id: number, @Body() dto: CreateCategoryDto) { return this.svc.update(id, dto); }

  @Roles(Role.RESTAURANT_ADMIN)
  @Patch(':id/sort')
  updateSort(@Param('id',ParseIntPipe) id: number, @Body('sortOrder') sort: number) { return this.svc.updateSort(id, sort); }

  @Roles(Role.RESTAURANT_ADMIN)
  @Delete(':id')
  remove(@Param('id',ParseIntPipe) id: number) { return this.svc.remove(id); }
}

