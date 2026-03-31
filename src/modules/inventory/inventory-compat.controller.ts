// RUTA: src/modules/inventory/inventory-compat.controller.ts
//
// ╔══════════════════════════════════════════════════════════════╗
// ║  CONTROLADOR DE COMPATIBILIDAD — Aliases para Jorge         ║
// ║                                                              ║
// ║  La App Android de Jorge usa estas rutas cortas:             ║
// ║    GET  /api/inventario      → GET  /api/v1/inventory/lots   ║
// ║    POST /api/inventario      → POST /api/v1/inventory/lots   ║
// ║    PATCH /api/inventario/:id → POST /api/v1/inventory/adj... ║
// ║                                                              ║
// ║  Las rutas /api/platillos y /api/staff se manejan en sus     ║
// ║  respectivos controladores de compatibilidad.                ║
// ║                                                              ║
// ║  IMPORTANTE: Estos aliases NO reemplazan los endpoints       ║
// ║  principales. Son un puente temporal mientras Jorge          ║
// ║  actualiza la App para usar /api/v1/*.                       ║
// ╚══════════════════════════════════════════════════════════════╝
import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard }     from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }       from '../../shared/guards/roles.guard';
import { Roles, Role }      from '../../shared/decorators/roles.decorator';
import { RestaurantId, CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequireFeature, PlanFeature } from '../../shared/decorators/require-feature.decorator';
import { CreateLotDto, AdjustmentDto } from './dto/inventory.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@RequireFeature(PlanFeature.INVENTORY_FIFO)
@Controller('inventario')   // alias sin /v1 para Jorge
export class InventoryCompatController {
  constructor(private readonly svc: InventoryService) {}

  /** GET /api/inventario — alias de GET /api/v1/inventory/lots */
  @Get()
  findAll(
    @RestaurantId() rid: number,
    @Query('expiringSoon') expiringSoon?: boolean,
  ) {
    return this.svc.findAllLots(rid, { expiringSoon });
  }

  /** POST /api/inventario — alias de POST /api/v1/inventory/lots */
  @Post()
  create(@RestaurantId() rid: number, @Body() dto: CreateLotDto) {
    return this.svc.createLot(rid, dto);
  }

  /**
   * PATCH /api/inventario/:id
   * Jorge: "Descontar stock cuando se cocina algo"
   * Cantidad negativa para descuento, positiva para corrección.
   */
  @Patch(':id')
  adjust(
    @Param('id', ParseIntPipe) lotId: number,
    @RestaurantId() rid: number,
    @Body('quantity') quantity: number,
    @Body('notes') notes: string,
    @CurrentUser() user: { id: number },
  ) {
    return this.svc.createAdjustment(rid, { lotId, quantity, notes }, user.id);
  }
}
