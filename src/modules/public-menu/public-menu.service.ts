/**
 * RUTA: src/modules/public-menu/public-menu.service.ts
 *
 * Servicio para la PWA pública (/menu/:slug).
 * Sin autenticación. Disponible en Plan Básico y Premium.
 *
 * Sección "Restaurante": solo visualización del menú.
 * Sección "Para Llevar":  menú + carrito + crear orden.
 *   - El comensal ve datos de su orden (sin estados de cocina).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { Restaurant }                    from '../restaurants/entities/restaurant.entity';
import { Order }                         from '../orders/entities/order.entity';

@Injectable()
export class PublicMenuService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async getMenu(
    slug: string,
    tableNumber?: string,
    mode: 'dine_in' | 'takeout' = 'dine_in',
  ) {
    const restaurant = await this.restaurantRepo.findOne({
      where:     { slug, isActive: true },
      relations: [
        'menus',
        'menus.categories',
        'menus.categories.dishes',
      ],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    // Calcular isActiveNow e isOrderableNow según timezone y schedule
    const now      = new Date();
    const timezone = restaurant.timezone ?? 'America/Monterrey';

    const menusWithAvailability = (restaurant as any).menus
      ?.filter((m) => m.isActive)
      .map((menu) => {
        const isActiveNow    = this.isMenuActiveNow(menu, now, timezone);
        const isOrderableNow = menu.allowOutsideSchedule ? true : isActiveNow;

        return {
          ...menu,
          isActiveNow,
          isOrderableNow,
          availabilityNote: !isActiveNow
            ? this.getAvailabilityNote(menu, timezone)
            : null,
          categories: menu.categories
            ?.filter((c) => c.isActive)
            .map((cat) => ({
              ...cat,
              dishes: cat.dishes?.filter((d) => !d.deletedAt && d.isAvailable),
            })),
        };
      });

    return {
      restaurant: {
        id:       restaurant.id,
        name:     restaurant.name,
        logoUrl:  restaurant.logoUrl,
        slug:     restaurant.slug,
        timezone,
        currency: restaurant.currency,
      },
      tableNumber: tableNumber ?? null,
      mode,
      /**
       * mode=dine_in:  comensal solo ve el menú, sin carrito
       * mode=takeout:  comensal puede agregar platillos al carrito
       *                y crear orden (POST /orders @Public)
       */
      cartEnabled: mode === 'takeout',
      menus: menusWithAvailability,
    };
  }

  /**
   * Retorna datos básicos de la orden Para Llevar.
   * SIN estados de cocina — el comensal no ve pending/preparing/ready.
   * Solo ve: folio, platillos, total, QR y estado simplificado.
   */
  async getOrderByFolio(slug: string, folio: string) {
    const restaurant = await this.restaurantRepo.findOneBy({ slug });
    if (!restaurant) throw new NotFoundException('Restaurante no encontrado');

    const order = await this.orderRepo.findOne({
      where:     { orderNumber: folio, restaurantId: restaurant.id },
      relations: ['items', 'items.dish'],
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    // Exponer solo información relevante para el comensal
    // SIN kitchen_status, SIN started_at, SIN ready_at
    return {
      folio:        order.orderNumber,
      customerName: order.customerName,
      qrCode:       order.qrCode,
      total:        order.total,
      createdAt:    order.createdAt,
      restaurant: {
        name:    restaurant.name,
        logoUrl: restaurant.logoUrl,
      },
      items: order.items.map((item) => ({
        dishName:     item.dish?.name,
        quantity:     item.quantity,
        unitPrice:    item.unitPrice,
        specialNotes: item.specialNotes,
      })),
      // Estado simplificado para el comensal (sin detalles de cocina)
      received: true,
    };
  }

  // ── Utilidades de horario ───────────────────────────────────────

  private isMenuActiveNow(menu: any, now: Date, timezone: string): boolean {
    if (!menu.schedule) return true; // sin horario = siempre activo
    try {
      const schedule = typeof menu.schedule === 'string'
        ? JSON.parse(menu.schedule)
        : menu.schedule;

      // schedule: { days: [1,2,3,4,5], start: "12:00", end: "16:00" }
      const localTime = new Intl.DateTimeFormat('es-MX', {
        timeZone:  timezone,
        weekday:   'short',
        hour:      '2-digit',
        minute:    '2-digit',
        hour12:    false,
      }).formatToParts(now);

      const dayMap: Record<string, number> = {
        lun: 1, mar: 2, mié: 3, jue: 4, vie: 5, sáb: 6, dom: 0,
      };
      const dayPart  = localTime.find((p) => p.type === 'weekday')?.value ?? '';
      const hourPart = localTime.find((p) => p.type === 'hour')?.value ?? '0';
      const minPart  = localTime.find((p) => p.type === 'minute')?.value ?? '0';

      const currentDay     = dayMap[dayPart.toLowerCase()] ?? -1;
      const currentMinutes = parseInt(hourPart) * 60 + parseInt(minPart);

      const [startH, startM] = schedule.start.split(':').map(Number);
      const [endH, endM]     = schedule.end.split(':').map(Number);
      const startMinutes     = startH * 60 + startM;
      const endMinutes       = endH * 60 + endM;

      return (
        schedule.days.includes(currentDay) &&
        currentMinutes >= startMinutes &&
        currentMinutes <= endMinutes
      );
    } catch {
      return true;
    }
  }

  private getAvailabilityNote(menu: any, _timezone: string): string {
    try {
      const schedule = typeof menu.schedule === 'string'
        ? JSON.parse(menu.schedule)
        : menu.schedule;
      return `Disponible de ${schedule.start} a ${schedule.end}`;
    } catch {
      return 'Consulta el horario del restaurante';
    }
  }
}
