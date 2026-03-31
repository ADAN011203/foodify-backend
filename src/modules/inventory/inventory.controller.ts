// RUTA: src/modules/inventory/inventory.controller.ts
// BASE PRINCIPAL : /api/v1/inventory   (backend v3.2)
// ALIAS JORGE    : /api/inventario     (ver inventory-compat.controller.ts)
//
// PLATAFORMA: App Android (restaurant_admin) — SOLO Plan Premium
//
// ═══════════════════════════════════════════════════════════
// ENDPOINTS PRINCIPALES:
//
//   GET    /items                → Lista insumos + stock + alertFlag
//   POST   /items                → Registrar nuevo insumo base
//   GET    /items/:id            → Detalle + lotes + movimientos
//   PUT    /items/:id            → Actualizar insumo
//   GET    /lots                 → Lotes activos con filtros
//   POST   /lots                 → Nueva entrada de mercancía (lote FIFO)
//   PUT    /lots/:id             → Editar lote
//   DELETE /lots/:id             → Dar de baja por merma
//   GET    /movements            → Historial movimientos
//   POST   /adjustments          → Ajuste manual post-auditoría
//   GET    /alerts               → Alertas activas (alertFlag=true)
//   PATCH  /alerts/:id/resolve   → Marcar alerta resuelta
// ═══════════════════════════════════════════════════════════
import {
  Body, Controller, Delete, Get, Param,
  ParseIntPipe, Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { InventoryService }  from './inventory.service';
import { JwtAuthGuard }      from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }        from '../../shared/guards/roles.guard';
import { Roles, Role }       from '../../shared/decorators/roles.decorator';
import { CurrentUser, RestaurantId } from '../../shared/decorators/current-user.decorator';
import { RequireFeature, PlanFeature } from '../../shared/decorators/require-feature.decorator';
import {
  CreateItemDto, UpdateItemDto,
  CreateLotDto, UpdateLotDto, AdjustmentDto,
} from './dto/inventory.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@RequireFeature(PlanFeature.INVENTORY_FIFO)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  // ── Items ──────────────────────────────────────────────────────
  @Get('items')
  findAllItems(@RestaurantId() rid: number) {
    return this.svc.findAllItems(rid);
  }

  @Post('items')
  createItem(@RestaurantId() rid: number, @Body() dto: CreateItemDto) {
    return this.svc.createItem(rid, dto);
  }

  @Get('items/:id')
  findOneItem(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() rid: number,
  ) {
    return this.svc.findOneItem(id, rid);
  }

  @Put('items/:id')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() rid: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.svc.updateItem(id, rid, dto);
  }

  // ── Lotes ──────────────────────────────────────────────────────

  /**
   * GET /api/v1/inventory/lots
   * Jorge: "Ver todos los lotes de insumos"
   * Filtros: ?itemId=, ?status=, ?expiringSoon=true
   *
   * Cada lote retorna:
   *   status: "available" | "low" | "critical" | "expired" | "depleted"
   *   alertFlag: true cuando status != "available"
   *   expiryDateFormatted: "dd/MM/yyyy" (compatible con la App de Jorge)
   */
  @Get('lots')
  findAllLots(
    @RestaurantId() rid: number,
    @Query('itemId') itemId?: number,
    @Query('status') status?: string,
    @Query('expiringSoon') expiringSoon?: boolean,
  ) {
    return this.svc.findAllLots(rid, { itemId, status, expiringSoon });
  }

  /**
   * POST /api/v1/inventory/lots
   * Jorge: "Registrar entrada de mercancía"
   * También disponible en alias POST /api/inventario
   */
  @Post('lots')
  createLot(@RestaurantId() rid: number, @Body() dto: CreateLotDto) {
    return this.svc.createLot(rid, dto);
  }

  @Put('lots/:id')
  updateLot(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLotDto) {
    return this.svc.updateLot(id, dto);
  }

  @Delete('lots/:id')
  removeLot(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() rid: number,
    @Body('notes') notes?: string,
  ) {
    return this.svc.removeLot(id, rid, notes);
  }

  // ── Movimientos ────────────────────────────────────────────────
  @Get('movements')
  findMovements(
    @RestaurantId() rid: number,
    @Query('lotId') lotId?: number,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.svc.findMovements(rid, { lotId, type, dateFrom, dateTo });
  }

  /**
   * POST /api/v1/inventory/adjustments
   * Jorge: PATCH /api/inventario/{id} — "Descontar stock cuando se cocina algo"
   * Cantidad positiva = entrada, negativa = descuento/merma
   */
  @Post('adjustments')
  createAdjustment(
    @RestaurantId() rid: number,
    @Body() dto: AdjustmentDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.svc.createAdjustment(rid, dto, user.id);
  }

  // ── Alertas ────────────────────────────────────────────────────

  /**
   * GET /api/v1/inventory/alerts
   * Retorna alertas activas con alertFlag=true.
   * Jorge: "El Backend debería enviarnos un flag de alerta:true"
   */
  @Get('alerts')
  findAlerts(@RestaurantId() rid: number) {
    return this.svc.findActiveAlerts(rid);
  }

  @Patch('alerts/:id/resolve')
  resolveAlert(@Param('id', ParseIntPipe) id: number) {
    return this.svc.resolveAlert(id);
  }

  /** Refresca estados de lotes por caducidad */
  @Post('refresh-statuses')
  refreshStatuses(@RestaurantId() rid: number) {
    return this.svc.refreshLotStatuses(rid);
  }
}
