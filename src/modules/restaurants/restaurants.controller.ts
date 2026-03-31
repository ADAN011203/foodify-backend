/**
 * RUTA: src/modules/restaurants/restaurants.controller.ts
 * BASE: /api/v1/restaurants
 *
 * ═══════════════════════════════════════════════════════════════════
 * PLATAFORMA: PWA (dashboard + config) + App Android Premium (operación)
 * ROL:        restaurant_admin
 *
 * ENDPOINTS PWA (Plan Básico y Premium):
 * ───────────────────────────────────────────────────────────────────
 *   GET   /              → Lista restaurantes del usuario
 *   GET   /:id           → Detalle del restaurante
 *   PUT   /:id           → Actualizar nombre, dirección, timezone
 *   PUT   /:id/logo      → Subir logo a S3 (PNG/JPG máx 2MB)
 *   PATCH /:id/status    → Activar o suspender
 *   PATCH /:id/settings  → Actualizar dashboard_config (toggles de gráficas)
 *   GET   /:id/dashboard → KPIs: ventas del día, pedidos activos,
 *                          alertas inventario, top platillos
 *
 * ENDPOINTS APP ANDROID (Solo Premium):
 * ───────────────────────────────────────────────────────────────────
 *   GET   /:id/dashboard → También accesible desde App Android en Premium
 *                          (mismos datos, diferente vista)
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RestaurantsService } from './restaurants.service';
import { JwtAuthGuard }       from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }         from '../../shared/guards/roles.guard';
import { Roles, Role }        from '../../shared/decorators/roles.decorator';
import { CurrentUser, RestaurantId } from '../../shared/decorators/current-user.decorator';
import { UpdateRestaurantDto, UpdateSettingsDto } from './dto/restaurant.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  // ════════════════════════════════════════════════════════════════
  // PWA — Plan Básico y Premium
  // ════════════════════════════════════════════════════════════════

  /** GET /api/v1/restaurants — Lista restaurantes del admin autenticado */
  @Get()
  findAll(@CurrentUser() user: { id: number }) {
    return this.restaurantsService.findByOwner(user.id);
  }

  /** GET /api/v1/restaurants/:id — Detalle del restaurante */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantsService.findOne(id);
  }

  /** PUT /api/v1/restaurants/:id — Actualizar nombre, dirección, timezone */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.update(id, dto);
  }

  /**
   * PUT /api/v1/restaurants/:id/logo
   * PWA: subir logo del restaurante a S3 (PNG/JPG, máx 2MB).
   * Se muestra en la cabecera del menú público y en la PWA admin.
   */
  @Put(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.restaurantsService.uploadLogo(id, file);
  }

  /** PATCH /api/v1/restaurants/:id/status — Activar o suspender */
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.restaurantsService.updateStatus(id, isActive);
  }

  /**
   * PATCH /api/v1/restaurants/:id/settings
   * PWA: actualizar dashboard_config JSON.
   * Los toggles de las 5 gráficas del dashboard se guardan aquí.
   *
   * Campos del dashboard_config:
   *   show_sales, show_top_dishes, show_peak_hours,
   *   show_category_income, show_dishes_by_menu
   */
  @Patch(':id/settings')
  updateSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.restaurantsService.updateSettings(id, dto);
  }

  /**
   * GET /api/v1/restaurants/:id/dashboard
   * PWA: KPIs del restaurante.
   * También accesible desde App Android en Plan Premium.
   *
   * Retorna:
   *   - Ventas del día
   *   - Pedidos activos del turno
   *   - Alertas de inventario activas (Solo Premium)
   *   - Top 5 platillos más vendidos
   *   - dashboard_config (para saber qué gráficas renderizar)
   */
  @Get(':id/dashboard')
  getDashboard(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantsService.getDashboard(id);
  }
}
