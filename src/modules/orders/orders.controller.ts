/**
 * RUTA: src/modules/orders/orders.controller.ts
 * BASE: /api/v1/orders
 *
 * ═══════════════════════════════════════════════════════════════════
 * ENDPOINTS PWA (restaurant_admin — Plan Básico y Premium)
 * ───────────────────────────────────────────────────────────────────
 *   GET  /                     → Lista pedidos con filtros
 *   GET  /active               → Pedidos activos del turno
 *   GET  /:id                  → Detalle completo
 *   PATCH /:id/status          → Cambiar estado (incl. confirmar entrega manual Plan Básico)
 *   PATCH /:id/cancel          → Cancelar pedido
 *
 * ENDPOINTS PWA PÚBLICA (sin JWT — @Public — Plan Básico y Premium)
 * ───────────────────────────────────────────────────────────────────
 *   POST /                     → Crear orden Para Llevar (comensal, type=takeout)
 *                                Genera QR único. Requiere customerName + customerPhone.
 *
 * ENDPOINTS APP ANDROID (JWT requerido)
 * ───────────────────────────────────────────────────────────────────
 *   POST /                     → Crear orden dine_in (waiter, type=dine_in) — Plan Premium
 *   POST /:id/items            → Agregar ítems — waiter / restaurant_admin
 *   PATCH /:id/items/:iid      → Modificar ítem — waiter / restaurant_admin
 *   DELETE /:id/items/:iid     → Eliminar ítem — waiter / restaurant_admin
 *   PATCH /:id/kitchen-status  → Cambiar estado de cocina — chef (Solo Premium)
 *
 * ENDPOINTS APP ANDROID — SOLO PREMIUM
 * ───────────────────────────────────────────────────────────────────
 *   PATCH /:id/scan-qr         → Escanear QR de orden Para Llevar → delivered
 *                                Roles: waiter, cashier — Solo Plan Premium
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { OrdersService }    from './orders.service';
import { JwtAuthGuard }     from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }       from '../../shared/guards/roles.guard';
import { Roles, Role, Public } from '../../shared/decorators/roles.decorator';
import { CurrentUser, RestaurantId } from '../../shared/decorators/current-user.decorator';
import { RequireFeature, PlanFeature } from '../../shared/decorators/require-feature.decorator';
import { CreateOrderDto }   from './dto/create-order.dto';
import {
  UpdateOrderStatusDto, AddOrderItemDto,
  UpdateOrderItemDto, ScanQrDto,
}                           from './dto/update-order.dto';
import { OrderType }        from './entities/order.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ════════════════════════════════════════════════════════════════
  // PWA PÚBLICA + APP ANDROID — POST / (crear orden)
  //
  // Este endpoint tiene doble comportamiento según el tipo:
  //   • type=takeout, sin JWT (@Public): comensal desde PWA "Para Llevar"
  //   • type=dine_in, con JWT (waiter):  mesero desde App Android
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/orders
   *
   * [PWA Pública — sin JWT] type=takeout
   *   Origen: comensal en sección "Para Llevar"
   *   Requiere: customerName, customerPhone
   *   Genera: QR único en campo qrCode
   *   Plan Básico:  admin confirma entrega manual desde PWA
   *   Plan Premium: waiter/cashier escanea QR con App Android
   *
   * [App Android — JWT waiter] type=dine_in
   *   Origen: waiter desde módulo de mesas
   *   Requiere: tableId, JWT con role=waiter
   *   Solo Plan Premium
   */
  @Public()
  @Post()
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Request() req: any,
  ) {
    // Determinar restaurantId y waiterId según el origen
    const isAuthenticated = !!req.user;

    if (dto.type === OrderType.DINE_IN && !isAuthenticated) {
      // dine_in requiere JWT
      throw new Error('Órdenes en restaurante requieren autenticación');
    }

    // Para takeout público el restaurantId viene del slug o del body
    // Para dine_in viene del JWT
    const restaurantId = isAuthenticated
      ? req.user.restaurantId
      : dto['restaurantId']; // el frontend debe enviarlo para el caso público

    const waiterId = isAuthenticated ? req.user.id : null;

    return this.ordersService.createOrder(dto, restaurantId, waiterId);
  }

  // ════════════════════════════════════════════════════════════════
  // PWA (restaurant_admin) + APP ANDROID (waiter, cashier)
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/orders
   * PWA: restaurant_admin ve todos los pedidos con filtros
   * App Android: waiter/cashier ven sus pedidos asignados
   */
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER, Role.CASHIER)
  @Get()
  findAll(
    @RestaurantId() restaurantId: number,
    @Query('status') status?: string,
    @Query('kitchenStatus') kitchenStatus?: string,
    @Query('tableId') tableId?: number,
    @Query('waiterId') waiterId?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ordersService.findAll(restaurantId, {
      status, kitchenStatus, tableId, waiterId, dateFrom, dateTo,
    });
  }

  /**
   * GET /api/v1/orders/active
   * PWA + App Android: pedidos activos del turno actual
   */
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER, Role.CASHIER)
  @Get('active')
  findActive(@RestaurantId() restaurantId: number) {
    return this.ordersService.findActive(restaurantId);
  }

  /**
   * GET /api/v1/orders/:id
   * PWA + App Android: detalle completo con ítems y notas especiales
   */
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER, Role.CASHIER)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
  ) {
    return this.ordersService.findOne(id, restaurantId);
  }

  /**
   * PATCH /api/v1/orders/:id/status
   *
   * [PWA — Plan Básico] restaurant_admin confirma entrega manual:
   *   body: { status: 'delivered' }
   *   Esto reemplaza el escaneo de QR cuando no hay App Android.
   *
   * [App Android — Plan Premium] waiter cambia a delivered para dine_in:
   *   body: { status: 'delivered' }
   */
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, restaurantId, dto);
  }

  /**
   * PATCH /api/v1/orders/:id/kitchen-status
   * App Android — chef (Solo Premium)
   * Cambia el estado de cocina de la orden completa.
   */
  @Roles(Role.CHEF, Role.RESTAURANT_ADMIN)
  @RequireFeature(PlanFeature.KITCHEN_MODULE)
  @Patch(':id/kitchen-status')
  updateKitchenStatus(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, restaurantId, dto);
  }

  // ════════════════════════════════════════════════════════════════
  // APP ANDROID SOLO PREMIUM — ESCANEO QR
  // ════════════════════════════════════════════════════════════════

  /**
   * PATCH /api/v1/orders/:id/scan-qr
   *
   * App Android — SOLO Plan Premium
   * Roles: waiter, cashier
   *
   * El waiter o cashier escanea el QR que el comensal muestra al recoger
   * su orden Para Llevar. Cambia el estado a 'delivered' y dispara el
   * trigger FIFO de inventario.
   *
   * Plan Básico NO tiene acceso a este endpoint (403 FORBIDDEN).
   * En Plan Básico el admin confirma mediante PATCH /:id/status desde PWA.
   */
  @Roles(Role.WAITER, Role.CASHIER)
  @RequireFeature(PlanFeature.QR_SCAN_DELIVERY)
  @Patch(':id/scan-qr')
  scanQr(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
  ) {
    return this.ordersService.scanQr(id, restaurantId);
  }

  // ════════════════════════════════════════════════════════════════
  // APP ANDROID — GESTIÓN DE ÍTEMS
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/orders/:id/items
   * App Android: waiter agrega ítems a una orden activa
   */
  @Roles(Role.WAITER, Role.RESTAURANT_ADMIN)
  @Post(':id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
    @Body() dto: AddOrderItemDto,
  ) {
    return this.ordersService.addItem(id, restaurantId, dto);
  }

  /**
   * PATCH /api/v1/orders/:id/items/:iid
   * App Android: waiter modifica cantidad o notas especiales de un ítem
   */
  @Roles(Role.WAITER, Role.RESTAURANT_ADMIN)
  @Patch(':id/items/:iid')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('iid', ParseIntPipe) iid: number,
    @RestaurantId() restaurantId: number,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateItem(id, iid, restaurantId, dto);
  }

  /**
   * DELETE /api/v1/orders/:id/items/:iid
   * App Android: waiter elimina un ítem del pedido activo
   */
  @Roles(Role.WAITER, Role.RESTAURANT_ADMIN)
  @Delete(':id/items/:iid')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('iid', ParseIntPipe) iid: number,
    @RestaurantId() restaurantId: number,
  ) {
    return this.ordersService.removeItem(id, iid, restaurantId);
  }

  /**
   * PATCH /api/v1/orders/:id/cancel
   * PWA + App Android: cancelar pedido con motivo
   */
  @Roles(Role.RESTAURANT_ADMIN, Role.WAITER)
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() restaurantId: number,
    @Body('cancelReason') cancelReason: string,
  ) {
    return this.ordersService.cancel(id, restaurantId, cancelReason);
  }
}
