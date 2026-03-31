/**
 * RUTA: src/modules/saas/saas.controller.ts
 * BASE: /api/v1/admin
 *
 * ═══════════════════════════════════════════════════════════════════
 * PLATAFORMA: PWA CODEX (saas.foodify.mx)
 * ROL:        saas_admin únicamente
 * PLAN:       N/A — uso interno del equipo CODEX
 *
 * Este módulo es el centro de operaciones de FOODIFY como negocio.
 * Gestiona todos los restaurantes clientes, suscripciones y pagos.
 *
 * Flujo de alta de un cliente (CODEX):
 *   1. POST /admin/restaurants/register → crea restaurante + admin + trial
 *   2. Cliente paga externamente
 *   3. POST /admin/subscriptions/:id/payment → status=active
 *   4. Si necesita Premium: PATCH /admin/subscriptions/:id/plan
 *
 * ENDPOINTS:
 * ───────────────────────────────────────────────────────────────────
 * Dashboard:
 *   GET  /dashboard/kpis
 *
 * Restaurantes:
 *   POST /restaurants/register        → Alta completa atómica
 *   GET  /restaurants                 → Lista con filtros
 *   GET  /restaurants/:id             → Detalle + métricas
 *   GET  /restaurants/:id/stats       → Platillos vendidos por menú
 *   GET  /restaurants/:id/menus       → Menús con horarios
 *   GET  /restaurants/:id/dishes/sold → Platillos vendidos con %
 *   PATCH /restaurants/:id/status     → Activar/suspender
 *
 * Suscripciones:
 *   GET  /subscriptions               → Todas con estado dinámico
 *   GET  /subscriptions/:id           → Detalle + historial de pagos
 *   PATCH /subscriptions/:id/status   → Cambiar estado
 *   PATCH /subscriptions/:id/plan     → Upgrade/downgrade
 *   POST /subscriptions/:id/payment   → Registrar pago manual → active
 *   POST /subscriptions/:id/reminder  → Enviar recordatorio por email
 *
 * Reportes:
 *   GET  /payments/report             → Reporte CSV/JSON de pagos
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { SaasService }   from './saas.service';
import { JwtAuthGuard }  from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }    from '../../shared/guards/roles.guard';
import { Roles, Role }   from '../../shared/decorators/roles.decorator';
import {
  RegisterRestaurantDto,
  UpdateSubscriptionStatusDto,
  ChangePlanDto,
  RegisterPaymentDto,
}                        from './dto/saas.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SAAS_ADMIN)
@Controller('admin')
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  // ════════════════════════════════════════════════════════════════
  // DASHBOARD — KPIs GLOBALES
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/admin/dashboard/kpis
   * PWA CODEX: panel principal con métricas globales de la plataforma.
   *
   * Retorna:
   *   - Restaurantes activos (active + trial)
   *   - MRR (sum amount_mxn WHERE status=active)
   *   - Clientes atendidos (sum de pedidos entregados)
   *   - Nuevos registros en el período
   *   - Pagos vencidos (past_due + suspended)
   *   - Ingresos del período (payment_transactions)
   */
  @Get('dashboard/kpis')
  getKpis(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.saasService.getKpis({ dateFrom, dateTo });
  }

  // ════════════════════════════════════════════════════════════════
  // GESTIÓN DE RESTAURANTES
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/admin/restaurants/register
   * PWA CODEX: alta completa de un nuevo cliente.
   *
   * Crea en transacción atómica:
   *   1. Restaurante (restaurants)
   *   2. Usuario restaurant_admin con contraseña temporal
   *   3. Suscripción en estado trial (30 días)
   *
   * Envía email de bienvenida al admin con sus credenciales.
   */
  @Post('restaurants/register')
  registerRestaurant(@Body() dto: RegisterRestaurantDto) {
    return this.saasService.registerRestaurant(dto);
  }

  /**
   * GET /api/v1/admin/restaurants
   * PWA CODEX: lista todos los restaurantes.
   * Filtros: ?plan=, ?status=, ?search=, ?page=, ?limit=
   */
  @Get('restaurants')
  getRestaurants(
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.saasService.getRestaurants({ plan, status, search, page: +page, limit: +limit });
  }

  /**
   * GET /api/v1/admin/restaurants/:id
   * PWA CODEX: detalle completo con métricas e historial de suscripción.
   */
  @Get('restaurants/:id')
  getRestaurant(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.getRestaurant(id);
  }

  /**
   * GET /api/v1/admin/restaurants/:id/stats
   * PWA CODEX: platillos vendidos por menú y período.
   * Query: ?period=month&start=&end=&menu_id=
   */
  @Get('restaurants/:id/stats')
  getRestaurantStats(
    @Param('id', ParseIntPipe) id: number,
    @Query('period') period?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('menu_id') menuId?: number,
  ) {
    return this.saasService.getRestaurantStats(id, { period, start, end, menuId });
  }

  /**
   * GET /api/v1/admin/restaurants/:id/menus
   * PWA CODEX: menús del restaurante con horarios y conteo de platillos.
   */
  @Get('restaurants/:id/menus')
  getRestaurantMenus(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.getRestaurantMenus(id);
  }

  /**
   * GET /api/v1/admin/restaurants/:id/dishes/sold
   * PWA CODEX: platillos vendidos con % del total e ingresos generados.
   * Query: ?period=month&start=&end=&menu_id=
   */
  @Get('restaurants/:id/dishes/sold')
  getDishesSold(
    @Param('id', ParseIntPipe) id: number,
    @Query('period') period?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('menu_id') menuId?: number,
  ) {
    return this.saasService.getDishesSold(id, { period, start, end, menuId });
  }

  /**
   * PATCH /api/v1/admin/restaurants/:id/status
   * PWA CODEX: activar o suspender un restaurante.
   * body: { isActive: boolean }
   */
  @Patch('restaurants/:id/status')
  updateRestaurantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.saasService.updateRestaurantStatus(id, isActive);
  }

  // ════════════════════════════════════════════════════════════════
  // GESTIÓN DE SUSCRIPCIONES Y PAGOS
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/admin/subscriptions
   * PWA CODEX: todas las suscripciones con estado de pago calculado.
   *
   * Estado calculado (campo payment_status en respuesta):
   *   🟢 Al corriente   → active AND next_billing_at > NOW()
   *   🟡 Por vencer     → active AND next_billing_at BETWEEN NOW() AND NOW()+7d
   *   🟠 Vencido <15d   → past_due AND DATEDIFF < 15
   *   🔴 Suspendido     → suspended OR DATEDIFF >= 15
   *   🟣 En disputa     → payment_transaction con status=dispute
   */
  @Get('subscriptions')
  getSubscriptions(
    @Query('status') status?: string,
    @Query('plan') plan?: string,
  ) {
    return this.saasService.getSubscriptions({ status, plan });
  }

  /**
   * GET /api/v1/admin/subscriptions/:id
   * PWA CODEX: detalle + historial completo de pagos de una suscripción.
   */
  @Get('subscriptions/:id')
  getSubscription(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.getSubscription(id);
  }

  /**
   * PATCH /api/v1/admin/subscriptions/:id/status
   * PWA CODEX: cambiar estado manualmente.
   * Estados: trial | active | past_due | suspended | cancelled
   *
   * Al suspender: restaurante.is_active = false (bloquea todo acceso)
   * Al activar:   restaurante.is_active = true
   */
  @Patch('subscriptions/:id/status')
  updateSubscriptionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubscriptionStatusDto,
  ) {
    return this.saasService.updateSubscriptionStatus(id, dto);
  }

  /**
   * PATCH /api/v1/admin/subscriptions/:id/plan
   * PWA CODEX: upgrade o downgrade de plan.
   *
   * Upgrade a Premium: waiter/chef/cashier pueden hacer login de inmediato.
   * Downgrade a Básico: waiter/chef/cashier pierden acceso al siguiente login.
   */
  @Patch('subscriptions/:id/plan')
  changePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePlanDto,
  ) {
    return this.saasService.changePlan(id, dto);
  }

  /**
   * POST /api/v1/admin/subscriptions/:id/payment
   * PWA CODEX: registrar pago manual del cliente.
   *
   * Flujo:
   *   1. Cliente paga (transferencia, efectivo, etc.)
   *   2. CODEX registra el pago en este endpoint
   *   3. status → active, next_billing_at = next_billing_at + 1 mes
   *   4. Se crea registro en payment_transactions con gateway_ref=MANUAL-{timestamp}
   */
  @Post('subscriptions/:id/payment')
  registerPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegisterPaymentDto,
  ) {
    return this.saasService.registerManualPayment(id, dto);
  }

  /**
   * POST /api/v1/admin/subscriptions/:id/reminder
   * PWA CODEX: enviar recordatorio de pago por email al restaurant_admin.
   * Se usa cuando next_billing_at está próximo o ya pasó.
   */
  @Post('subscriptions/:id/reminder')
  sendReminder(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.sendPaymentReminder(id);
  }

  // ════════════════════════════════════════════════════════════════
  // REPORTES
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/admin/payments/report
   * PWA CODEX: reporte exportable de pagos en CSV o JSON.
   * Query: ?period=&format=csv|json&dateFrom=&dateTo=
   */
  @Get('payments/report')
  getPaymentsReport(
    @Query('format') format: 'csv' | 'json' = 'json',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.saasService.getPaymentsReport({ format, dateFrom, dateTo });
  }
}
