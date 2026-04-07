// RUTA: src/modules/dishes/dishes.controller.ts
// BASE: /api/v1/dishes
// PLATAFORMA: PWA (restaurant_admin) + App Android Premium (waiter consulta catálogo, chef consulta recetas)
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DishesService }    from './dishes.service';
import { JwtAuthGuard }     from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }       from '../../shared/guards/roles.guard';
import { Roles, Role }      from '../../shared/decorators/roles.decorator';
import { RestaurantId, CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CreateDishDto, UpdateDishDto } from './dto/dish.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dishes')
export class DishesController {
  constructor(private readonly svc: DishesService) {}

  /**
   * GET /api/v1/dishes — Catálogo de platillos
   * Roles: restaurant_admin, waiter, chef, cashier
   * waiter/chef/cashier → auto-filtro: solo disponibles y no eliminados
   */
  @Get('test-roles')
  testRoles(@CurrentUser() user: any) {
     return { roles: 'none', user };
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER, Role.CASHIER)
  @Get()
  findAll(
    @RestaurantId() rid: number,
    @CurrentUser() user: { role: string },
    @Query('categoryId') cat?: number,
    @Query('available') available?: boolean,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll(rid, { categoryId: cat, available, search }, user.role);
  }

  /**
   * GET /api/v1/dishes/:id — Detalle de platillo
   * Roles: restaurant_admin, waiter, chef, cashier
   */
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER, Role.CASHIER, Role.CHEF)
  @Get(':id')
  findOne(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number) {
    return this.svc.findOne(id, rid);
  }

  /** POST /api/v1/dishes — PWA: crear platillo (solo admin) */
  @Roles(Role.RESTAURANT_ADMIN)
  @Post()
  create(@RestaurantId() rid: number, @Body() dto: CreateDishDto) { return this.svc.create(rid, dto); }

  /** PUT /api/v1/dishes/:id — PWA: actualizar platillo (solo admin) */
  @Roles(Role.RESTAURANT_ADMIN)
  @Put(':id')
  update(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number, @Body() dto: UpdateDishDto) { return this.svc.update(id, rid, dto); }

  /**
   * PATCH /api/v1/dishes/:id/availability — Toggle manual (solo admin)
   * También lo hace automáticamente el trigger FIFO cuando stock llega a 0.
   */
  @Roles(Role.RESTAURANT_ADMIN)
  @Patch(':id/availability')
  toggleAvailability(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number) { return this.svc.toggleAvailability(id, rid); }

  /** DELETE /api/v1/dishes/:id — Soft delete (solo admin) */
  @Roles(Role.RESTAURANT_ADMIN)
  @Delete(':id')
  remove(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number) { return this.svc.remove(id, rid); }

  /** PUT /api/v1/dishes/:id/images — Subir hasta 3 imágenes a S3 (solo admin) */
  @Roles(Role.RESTAURANT_ADMIN)
  @Put(':id/images')
  @UseInterceptors(FilesInterceptor('files', 3))
  uploadImages(@Param('id',ParseIntPipe) id: number, @RestaurantId() rid: number, @UploadedFiles() files: Express.Multer.File[]) {
    return this.svc.uploadImages(id, rid, files);
  }
}

