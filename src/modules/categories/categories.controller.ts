// RUTA: src/modules/categories/categories.controller.ts
// BASE: /api/v1/menus/:menuId/categories  (anidado bajo menus)
// PLATAFORMA: PWA (restaurant_admin)
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles, Role }  from '../../shared/decorators/roles.decorator';
import { CreateCategoryDto } from './dto/category.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('menus/:menuId/categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}
  @Get()    findAll(@Param('menuId',ParseIntPipe) menuId: number) { return this.svc.findByMenu(menuId); }
  @Get(':id') findOne(@Param('id',ParseIntPipe) id: number) { return this.svc.findOne(id); }
  @Post()   create(@Param('menuId',ParseIntPipe) menuId: number, @Body() dto: CreateCategoryDto) { return this.svc.create(menuId, dto); }
  @Put(':id') update(@Param('id',ParseIntPipe) id: number, @Body() dto: CreateCategoryDto) { return this.svc.update(id, dto); }
  @Patch(':id/sort') updateSort(@Param('id',ParseIntPipe) id: number, @Body('sortOrder') sort: number) { return this.svc.updateSort(id, sort); }
  @Delete(':id') remove(@Param('id',ParseIntPipe) id: number) { return this.svc.remove(id); }
}
