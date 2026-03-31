// RUTA: src/modules/reports/reports.controller.ts
// BASE: /api/v1/reports
// PLATAFORMA: PWA (restaurant_admin) — Plan Básico y Premium
// Reportes de staff y cocina: Solo Premium
import {
  Controller, Get, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response }     from 'express';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles, Role }  from '../../shared/decorators/roles.decorator';
import { RestaurantId } from '../../shared/decorators/current-user.decorator';
import { RequireFeature, PlanFeature } from '../../shared/decorators/require-feature.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('reports')
export class ReportsController {

  // ── G1: Ventas por período ─────────────────────────────────────
  /** GET /api/v1/reports/sales?period=today|week|month|quarter|year|custom&start=&end= */
  @Get('sales')
  getSales(
    @RestaurantId() rid: number,
    @Query('period') period = 'today',
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return { message: 'Ventas por período', restaurantId: rid, period, start, end };
  }

  // ── G2: Top platillos ──────────────────────────────────────────
  /** GET /api/v1/reports/dishes/top?period=&limit=10 */
  @Get('dishes/top')
  getTopDishes(
    @RestaurantId() rid: number,
    @Query('period') period = 'month',
    @Query('limit') limit = 10,
  ) {
    return { message: 'Top platillos más vendidos', restaurantId: rid, period, limit };
  }

  // ── G3: Horas pico ────────────────────────────────────────────
  /** GET /api/v1/reports/peak-hours?period= */
  @Get('peak-hours')
  getPeakHours(
    @RestaurantId() rid: number,
    @Query('period') period = 'week',
  ) {
    return { message: 'Distribución de pedidos por hora (00-23h)', restaurantId: rid, period };
  }

  // ── G4: Ingresos por categoría ────────────────────────────────
  /** GET /api/v1/reports/category-income?period= */
  @Get('category-income')
  getCategoryIncome(
    @RestaurantId() rid: number,
    @Query('period') period = 'month',
  ) {
    return { message: 'Ingresos por categoría del menú', restaurantId: rid, period };
  }

  // ── G5: Platillos vendidos por menú ───────────────────────────
  /** GET /api/v1/reports/dishes/sold?menuId=&period=&start=&end= */
  @Get('dishes/sold')
  getDishesSold(
    @RestaurantId() rid: number,
    @Query('menuId') menuId?: number,
    @Query('period') period = 'month',
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return { message: 'Platillos vendidos por menú y categoría', restaurantId: rid, menuId, period, start, end };
  }

  // ── Resumen de menús ──────────────────────────────────────────
  /** GET /api/v1/reports/menus/summary?period= */
  @Get('menus/summary')
  getMenuSummary(
    @RestaurantId() rid: number,
    @Query('period') period = 'month',
  ) {
    return { message: 'Resumen de menús activos, horarios y categorías', restaurantId: rid, period };
  }

  // ── Solo Premium ──────────────────────────────────────────────

  /** GET /api/v1/reports/inventory/cost?period= */
  @RequireFeature(PlanFeature.INVENTORY_FIFO)
  @Get('inventory/cost')
  getInventoryCost(
    @RestaurantId() rid: number,
    @Query('period') period = 'month',
  ) {
    return { message: 'Insumos con mayor gasto operativo', restaurantId: rid, period };
  }

  /** GET /api/v1/reports/inventory/waste?period= */
  @RequireFeature(PlanFeature.INVENTORY_FIFO)
  @Get('inventory/waste')
  getInventoryWaste(
    @RestaurantId() rid: number,
    @Query('period') period = 'month',
  ) {
    return { message: 'Mermas por tipo y lote', restaurantId: rid, period };
  }

  /** GET /api/v1/reports/staff?period=&userId= */
  @RequireFeature(PlanFeature.STAFF_REPORTS)
  @Get('staff')
  getStaffReport(
    @RestaurantId() rid: number,
    @Query('period') period = 'month',
    @Query('userId') userId?: number,
  ) {
    return { message: 'Rendimiento por empleado', restaurantId: rid, period, userId };
  }

  /** GET /api/v1/reports/kitchen/performance?period= */
  @RequireFeature(PlanFeature.KITCHEN_MODULE)
  @Get('kitchen/performance')
  getKitchenPerformance(
    @RestaurantId() rid: number,
    @Query('period') period = 'week',
  ) {
    return { message: 'Tiempo promedio de preparación por platillo', restaurantId: rid, period };
  }

  /** GET /api/v1/reports/export?type=sales|dishes|inventory&period=&format=csv|xlsx */
  @Get('export')
  exportReport(
    @RestaurantId() rid: number,
    @Query('type') type = 'sales',
    @Query('period') period = 'month',
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: Response,
  ) {
    // TODO: generar CSV/XLSX real con ExcelJS o csv-writer
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${period}.${format}`);
    res.send(`type,value\nexport,${type}-${period}-restaurant${rid}`);
  }
}
