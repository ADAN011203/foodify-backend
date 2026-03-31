// RUTA: src/modules/recipes/recipes.controller.ts
// PLATAFORMA: PWA + App Android Premium (chef consulta recetas)
import {
  Body, Controller, Delete, Get, Param,
  ParseIntPipe, Post, Put, UseGuards,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard }   from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }     from '../../shared/guards/roles.guard';
import { Roles, Role }    from '../../shared/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dishes')
export class RecipesController {
  constructor(private readonly svc: RecipesService) {}

  @Roles(Role.RESTAURANT_ADMIN, Role.CHEF)
  @Get(':id/recipe')
  findByDish(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findByDish(id);
  }

  @Roles(Role.RESTAURANT_ADMIN)
  @Put(':id/recipe')
  upsert(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.upsert(id, dto);
  }

  @Roles(Role.RESTAURANT_ADMIN)
  @Post(':id/recipe/ingredients')
  addIngredient(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.addIngredient(id, dto);
  }

  @Roles(Role.RESTAURANT_ADMIN)
  @Put(':id/recipe/ingredients/:iid')
  updateIngredient(@Param('iid', ParseIntPipe) iid: number, @Body() dto: any) {
    return this.svc.updateIngredient(iid, dto);
  }

  @Roles(Role.RESTAURANT_ADMIN)
  @Delete(':id/recipe/ingredients/:iid')
  removeIngredient(@Param('iid', ParseIntPipe) iid: number) {
    return this.svc.removeIngredient(iid);
  }
}
