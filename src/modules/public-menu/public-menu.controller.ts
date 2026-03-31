/**
 * RUTA: src/modules/public-menu/public-menu.controller.ts
 * BASE: /menu
 *
 * ═══════════════════════════════════════════════════════════════════
 * PLATAFORMA: PWA Pública — sin autenticación (@Public)
 * DISPONIBLE: Plan Básico y Premium
 *
 * Este módulo expone la PWA pública del restaurante.
 * Tiene DOS secciones con comportamiento diferente:
 *
 * ── SECCIÓN "RESTAURANTE" (/menu/:slug?mode=dine_in) ──────────────
 *   • El comensal escanea el QR de su mesa
 *   • Solo visualización del menú digital
 *   • SIN carrito, SIN crear órdenes
 *   • El waiter genera la orden desde App Android (Solo Premium)
 *
 * ── SECCIÓN "PARA LLEVAR" (/menu/:slug?mode=takeout) ──────────────
 *   • Disponible en Plan Básico y Premium
 *   • El comensal selecciona platillos → carrito → checkout
 *   • POST /orders sin JWT (@Public) crea la orden con type=takeout
 *   • Se genera QR único por orden
 *   • Sección "Mis Órdenes": el comensal ve datos de su orden
 *     (sin estados de cocina en ningún plan)
 *
 * ENDPOINTS:
 * ───────────────────────────────────────────────────────────────────
 *   GET  /:slug              → Menú activo del restaurante
 *   GET  /:slug/order/:folio → Datos de una orden Para Llevar (sin estados)
 * ═══════════════════════════════════════════════════════════════════
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicMenuService }             from './public-menu.service';
import { Public }                        from '../../shared/decorators/roles.decorator';

@Public()
@Controller('menu')
export class PublicMenuController {
  constructor(private readonly publicMenuService: PublicMenuService) {}

  /**
   * GET /menu/:slug
   * GET /menu/:slug?table=N       → incluye número de mesa en la respuesta
   * GET /menu/:slug?mode=takeout  → sección Para Llevar (con carrito habilitado)
   * GET /menu/:slug?mode=dine_in  → sección Restaurante (solo visualización)
   *
   * Retorna menús activos con campos calculados según timezone del restaurante:
   *   - isActiveNow:     si el menú está activo en este momento
   *   - isOrderableNow:  si se pueden hacer pedidos (según allow_outside_schedule)
   *   - availabilityNote: texto informativo de horario
   *
   * El comensal ve:
   *   - Categorías y platillos activos
   *   - Fotos, precios, descripción, alérgenos
   *   - Tiempo estimado de preparación
   *
   * MODO RESTAURANTE (dine_in):
   *   - Sin botón de carrito en los platillos
   *   - El waiter genera la orden desde App Android
   *
   * MODO PARA LLEVAR (takeout):
   *   - Con botón "Agregar al carrito" en cada platillo
   *   - El comensal puede crear su orden (POST /orders @Public)
   */
  @Get(':slug')
  getMenu(
    @Param('slug') slug: string,
    @Query('table') tableNumber?: string,
    @Query('mode') mode?: 'dine_in' | 'takeout',
  ) {
    return this.publicMenuService.getMenu(slug, tableNumber, mode);
  }

  /**
   * GET /menu/:slug/order/:folio
   *
   * Sección "Mis Órdenes" del comensal.
   * El comensal puede ver los datos de su orden Para Llevar:
   *   - Folio y QR de la orden
   *   - Lista de platillos y cantidades
   *   - Total y datos del restaurante
   *
   * IMPORTANTE: NO se muestran los estados de cocina (pending/preparing/ready)
   * en ningún plan. El comensal solo ve si su orden fue recibida.
   *
   * Esto es por diseño: los estados internos de cocina son operativos
   * y no se exponen al cliente final.
   */
  @Get(':slug/order/:folio')
  getOrderStatus(
    @Param('slug') slug: string,
    @Param('folio') folio: string,
  ) {
    return this.publicMenuService.getOrderByFolio(slug, folio);
  }
}
