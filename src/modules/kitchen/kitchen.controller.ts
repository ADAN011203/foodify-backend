/**
 * RUTA: src/modules/kitchen/kitchen.controller.ts
 * BASE: /api/v1/kitchen
 *
 * ═══════════════════════════════════════════════════════════════════
 * PLATAFORMA: App Android — SOLO Plan Premium
 * ROLES:      chef, restaurant_admin
 *
 * Este módulo NO está disponible en Plan Básico.
 * El PlanGuard rechaza con 403 si el plan no incluye KITCHEN_MODULE.
 *
 * ENDPOINTS APP ANDROID (chef):
 * ───────────────────────────────────────────────────────────────────
 *   GET    /orders                   → Comandas activas del turno
 *   GET    /orders/:id               → Detalle de comanda con ítems y notas
 *   PATCH  /orders/:id/status        → pending→preparing→ready→delivered
 *   PATCH  /order-items/:id/status   → Estado individual por ítem
 *   GET    /dishes                   → Platillos con receta resumida
 *   GET    /dishes/:id/recipe        → Receta completa con steps
 *   GET    /stats                    → Stats del turno actual
 *   POST   /sessions/start           → Iniciar sesión de turno
 *   PATCH  /sessions/:id/end         → Cerrar sesión de turno
 *
 * ENDPOINTS APP ANDROID (restaurant_admin en Premium):
 * ───────────────────────────────────────────────────────────────────
 *   POST   /recipes                  → Crear receta de platillo
 *   PUT    /recipes/:id              → Actualizar receta existente
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Put, UseGuards, Query,
} from '@nestjs/common';
import { KitchenService }  from './kitchen.service';
import { JwtAuthGuard }    from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }      from '../../shared/guards/roles.guard';
import { Roles, Role }     from '../../shared/decorators/roles.decorator';
import { RestaurantId, CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequireFeature, PlanFeature } from '../../shared/decorators/require-feature.decorator';
import { UpdateKitchenStatusDto, UpdateItemStatusDto, CreateRecipeDto } from './dto/kitchen.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@RequireFeature(PlanFeature.KITCHEN_MODULE)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  // ════════════════════════════════════════════════════════════════
  // HISTORIAL Y LIMPIEZA
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/kitchen/orders/history
   * App Android — chef
   * Lista comandas finalizadas (entregadas/canceladas).
   * Por defecto muestra las últimas 24 horas.
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @Get('orders/history')
  getHistory(
    @RestaurantId() restaurantId: number,
    @Query('date') date?: string,
  ) {
    return this.kitchenService.getOrdersHistory(restaurantId, date);
  }

  /**
   * PATCH /api/v1/kitchen/orders/archive-all
   * App Android — chef
   * Limpia/Oculta por completo la vista de historial actual.
   */
  @Roles(Role.CHEF)
  @Patch('orders/archive-all')
  archiveAll(@RestaurantId() restaurantId: number) {
    return this.kitchenService.archiveAllHistory(restaurantId);
  }

  /**
   * PATCH /api/v1/kitchen/orders/:id/archive
   * App Android — chef
   * Oculta una comanda del historial de cocina.
   */
  @Roles(Role.CHEF)
  @Patch('orders/:id/archive')
  archiveOrder(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
  ) {
    return this.kitchenService.archiveOrder(id, restaurantId);
  }

  // ════════════════════════════════════════════════════════════════
  // COMANDAS
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/kitchen/orders
   * App Android — chef
   * Lista comandas activas del turno (kitchen_status != delivered).
   * Ordenadas por createdAt ASC (más antigua primero).
   * El frontend calcula el tiempo transcurrido para colores de urgencia:
   *   - pending > 20min  → borde ROJO
   *   - preparing > 30min → borde NARANJA
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @Get('orders')
  getActiveOrders(@RestaurantId() restaurantId: number) {
    return this.kitchenService.getActiveOrders(restaurantId);
  }

  /**
   * GET /api/v1/kitchen/orders/:id
   * App Android — chef
   * Detalle de comanda: todos los ítems con notas especiales del mesero.
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @Get('orders/:id')
  getOrder(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
  ) {
    return this.kitchenService.getOrder(id, restaurantId);
  }

  /**
   * PATCH /api/v1/kitchen/orders/:id/status
   * App Android — chef
   * Cambia kitchen_status: pending → preparing → ready → delivered
   * Estados NO retroceden. Validación en el service.
   *
   * Cuando todos los order_items = ready:
   *   El trigger MySQL cambia kitchen_status = ready automáticamente
   *   y emite order:ready al namespace /restaurant (notifica al waiter).
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @Patch('orders/:id/status')
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
    @Body() dto: UpdateKitchenStatusDto,
  ) {
    return this.kitchenService.updateOrderStatus(id, restaurantId, dto);
  }

  /**
   * PATCH /api/v1/kitchen/order-items/:id/status
   * App Android — chef
   * Cambia el estado de un ítem individual:
   *   pending → preparing → ready → served
   *
   * Al marcar como 'preparing': actualiza started_at = NOW()
   * Al marcar como 'ready':     actualiza ready_at = NOW()
   *   Si TODOS los ítems del pedido = ready:
   *     → kitchen_status = ready automático (trigger MySQL)
   *     → emite order:ready al WS /restaurant (notifica mesero + push FCM)
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @Patch('order-items/:id/status')
  updateItemStatus(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.kitchenService.updateItemStatus(id, restaurantId, dto);
  }

  // ════════════════════════════════════════════════════════════════
  // PLATILLOS Y RECETAS
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/kitchen/dishes
   * App Android — chef
   * Lista platillos del restaurante con receta resumida para consulta rápida.
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @Get('dishes')
  getDishes(@RestaurantId() restaurantId: number) {
    return this.kitchenService.getDishes(restaurantId);
  }

  /**
   * GET /api/v1/kitchen/dishes/:id/recipe
   * App Android — chef
   * Receta completa: ingredientes con cantidades + steps numerados.
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @Get('dishes/:id/recipe')
  getRecipe(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
  ) {
    return this.kitchenService.getRecipe(id, restaurantId);
  }

  /**
   * POST /api/v1/kitchen/recipes
   * App Android — restaurant_admin (en Premium)
   * Crear receta de un platillo.
   */
  @Roles(Role.RESTAURANT_ADMIN)
  @Post('recipes')
  createRecipe(
    @RestaurantId() restaurantId: number,
    @Body() dto: CreateRecipeDto,
  ) {
    return this.kitchenService.createRecipe(restaurantId, dto);
  }

  /**
   * PUT /api/v1/kitchen/recipes/:id
   * App Android — restaurant_admin (en Premium)
   * Actualizar receta existente.
   */
  @Roles(Role.RESTAURANT_ADMIN)
  @Put('recipes/:id')
  updateRecipe(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
    @Body() dto: CreateRecipeDto,
  ) {
    return this.kitchenService.updateRecipe(id, restaurantId, dto);
  }

  // ════════════════════════════════════════════════════════════════
  // ESTADÍSTICAS Y TURNOS
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/kitchen/stats
   * App Android — chef
   * Stats del turno actual: comandas completadas, tiempo promedio de prep.
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @Get('stats')
  getStats(
    @RestaurantId() restaurantId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.kitchenService.getStats(restaurantId, user.id);
  }

  /**
   * POST /api/v1/kitchen/sessions/start
   * App Android — chef
   * Inicia sesión de turno. Registra en kitchen_sessions.
   */
  @Roles(Role.CHEF)
  @Post('sessions/start')
  startSession(
    @RestaurantId() restaurantId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.kitchenService.startSession(restaurantId, user.id);
  }

  /**
   * PATCH /api/v1/kitchen/sessions/:id/end
   * App Android — chef
   * Cierra sesión de turno. Actualiza ended_at = NOW().
   */
  @Roles(Role.CHEF)
  @Patch('sessions/:id/end')
  endSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.kitchenService.endSession(id, user.id);
  }
}
