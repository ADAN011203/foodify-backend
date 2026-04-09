/**
 * RUTA: src/modules/kitchen/kitchen.service.ts
 *
 * SOLO Plan Premium — App Android (chef, restaurant_admin)
 *
 * Estados de ítem: pending → preparing → ready → served (sin retroceder)
 * Cuando TODOS los ítems = ready:
 *   → orders.kitchen_status = 'ready' (trigger MySQL o lógica aquí)
 *   → emite order:ready al WS /restaurant (notifica waiter + FCM)
 */
import {
  BadRequestException, Injectable, NotFoundException,
  Inject, forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not, IsNull }       from 'typeorm';

import { Order, KitchenStatus }  from '../orders/entities/order.entity';
import { OrderItem, ItemStatus } from '../orders/entities/order-item.entity';
import { KitchenSession }        from './entities/kitchen-session.entity';
import { KitchenGateway }        from './kitchen.gateway';
import { OrdersGateway }         from '../orders/orders.gateway';
import { DishesService }         from '../dishes/dishes.service';
import { RecipesService }        from '../recipes/recipes.service';
import {
  UpdateKitchenStatusDto,
  UpdateItemStatusDto,
  CreateRecipeDto,
} from './dto/kitchen.dto';

// Orden válida de transiciones de estado
const KITCHEN_STATUS_ORDER = [
  KitchenStatus.PENDING,
  KitchenStatus.PREPARING,
  KitchenStatus.READY,
  KitchenStatus.DELIVERED,
];

const ITEM_STATUS_ORDER = [
  ItemStatus.PENDING,
  ItemStatus.PREPARING,
  ItemStatus.READY,
  ItemStatus.SERVED,
];

@Injectable()
export class KitchenService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private itemRepo: Repository<OrderItem>,
    @InjectRepository(KitchenSession)
    private sessionRepo: Repository<KitchenSession>,
    private kitchenGateway: KitchenGateway,
    @Inject(forwardRef(() => OrdersGateway)) private ordersGateway: OrdersGateway,
    private dishesService:  DishesService,
    private recipesService: RecipesService,
  ) {}

  // ── Comandas activas ────────────────────────────────────────────
  async getActiveOrders(restaurantId: number) {
    const orders = await this.orderRepo.find({
      where: [
        { restaurant: { id: restaurantId }, kitchenStatus: KitchenStatus.PENDING },
        { restaurant: { id: restaurantId }, kitchenStatus: KitchenStatus.PREPARING },
        { restaurant: { id: restaurantId }, kitchenStatus: KitchenStatus.READY },
      ],
      relations: ['items', 'items.dish', 'table', 'waiter'],
      order:     { createdAt: 'ASC' },
    });
    return orders.map(o => this.mapToKitchenOrderDto(o));
  }

  async getOrder(id: number, restaurantId: number) {
    const order = await this.orderRepo.findOne({
      where:     { id, restaurant: { id: restaurantId } },
      relations: ['items', 'items.dish', 'table', 'waiter'],
    });
    if (!order) throw new NotFoundException('Comanda no encontrada');
    return this.mapToKitchenOrderDto(order);
  }

  private mapToKitchenOrderDto(order: Order) {
    return {
      id:            order.id,
      orderNumber:   order.orderNumber,
      tableId:       order.tableId,
      tableNumber:   order.table?.number ?? null,
      type:          order.type,
      kitchenStatus: order.kitchenStatus,
      status:        order.status,
      waiterName:    order.waiter?.fullName ?? 'N/A',
      createdAt:     order.createdAt,
      items: (order.items || []).map(i => ({
        id:           i.id,
        dishId:       i.dishId,
        dishName:     i.dish?.name ?? 'Desconocido',
        quantity:     i.quantity,
        specialNotes: i.specialNotes,
        status:       i.status,
        startedAt:    i.startedAt,
        readyAt:      i.readyAt,
      })),
    };
  }

  // ── Cambiar estado de comanda completa ──────────────────────────
  async updateOrderStatus(
    id: number,
    restaurantId: number,
    dto: UpdateKitchenStatusDto,
  ) {
    const order = await this.orderRepo.findOne({
      where:     { id, restaurant: { id: restaurantId } },
      relations: ['items', 'items.dish', 'table', 'waiter'],
    });
    if (!order) throw new NotFoundException('Comanda no encontrada');

    const currentIdx = KITCHEN_STATUS_ORDER.indexOf(order.kitchenStatus);
    const nextIdx    = KITCHEN_STATUS_ORDER.indexOf(dto.status as unknown as KitchenStatus);

    if (nextIdx <= currentIdx) {
      throw new BadRequestException(
        `Transición inválida de cocina: ${order.kitchenStatus} → ${dto.status}`,
      );
    }

    await this.orderRepo.update(id, {
      kitchenStatus: dto.status as unknown as KitchenStatus,
    });

    // Notificar al namespace /restaurant
    this.ordersGateway.emitOrderStatusChanged(restaurantId, {
      orderId:       id,
      kitchenStatus: dto.status,
    });

    if ((dto.status as unknown as KitchenStatus) === KitchenStatus.READY) {
      this.ordersGateway.emitOrderReady(restaurantId, {
        orderId:     id,
        tableNumber: order.tableId,
        itemsCount:  order.items?.length ?? 0,
      });
    }

    return this.getOrder(id, restaurantId);
  }

  // ── Cambiar estado de ítem individual ───────────────────────────
  async updateItemStatus(
    itemId: number,
    restaurantId: number,
    dto: UpdateItemStatusDto,
  ) {
    const item = await this.itemRepo.findOne({
      where:     { id: itemId },
      relations: ['order'],
    });
    if (!item || item.order.restaurantId !== restaurantId) {
      throw new NotFoundException('Ítem no encontrado');
    }

    if (item.status === (dto.status as unknown as ItemStatus)) return item;

    const currentIdx = ITEM_STATUS_ORDER.indexOf(item.status);
    const nextIdx    = ITEM_STATUS_ORDER.indexOf(dto.status as unknown as ItemStatus);

    if (nextIdx <= currentIdx) {
      throw new BadRequestException(
        `Transición inválida de ítem: ${item.status} → ${dto.status}`,
      );
    }

    const updates: Partial<OrderItem> = { status: dto.status as unknown as ItemStatus };
    if ((dto.status as unknown as ItemStatus) === ItemStatus.PREPARING) updates.startedAt = new Date();
    if ((dto.status as unknown as ItemStatus) === ItemStatus.READY)     updates.readyAt   = new Date();

    await this.itemRepo.update(itemId, updates);

    // Verificar si TODOS los ítems del pedido están listos
    if ((dto.status as unknown as ItemStatus) === ItemStatus.READY) {
      await this.checkAllItemsReady(item.orderId, restaurantId);
    }

    return this.itemRepo.findOneBy({ id: itemId });
  }

  /**
   * Si todos los order_items del pedido están en 'ready',
   * actualizar kitchen_status = 'ready' y emitir order:ready al waiter.
   */
  private async checkAllItemsReady(orderId: number, restaurantId: number) {
    const allItems = await this.itemRepo.find({ where: { orderId } });
    const allReady = allItems.every(
      (i) => i.status === ItemStatus.READY || i.status === ItemStatus.SERVED,
    );

    if (allReady) {
      await this.orderRepo.update(orderId, {
        kitchenStatus: KitchenStatus.READY,
      });

      const order = await this.orderRepo.findOneBy({ id: orderId });
      this.ordersGateway.emitOrderReady(restaurantId, {
        orderId,
        tableNumber: order?.tableId,
        itemsCount:  allItems.length,
      });
      this.kitchenGateway.emitOrderReady(restaurantId, {
        orderId,
        tableNumber: order?.tableId,
      });
    }
  }

  // ── Platillos y recetas ─────────────────────────────────────────
  async getDishes(restaurantId: number) {
    // Retornamos todos los platillos activos del restaurante
    return this.dishesService.findAll(restaurantId, {}, 'chef');
  }

  async getRecipe(dishId: number, restaurantId: number) {
    // Validar primero que el platillo pertenece al restaurante (seguridad)
    await this.dishesService.findOne(dishId, restaurantId);
    return this.recipesService.findByDish(dishId);
  }

  async createRecipe(restaurantId: number, dto: CreateRecipeDto) {
    return { message: 'Ver RecipesService.create', restaurantId, dto };
  }

  async updateRecipe(id: number, restaurantId: number, dto: CreateRecipeDto) {
    return { message: 'Ver RecipesService.update', id, restaurantId, dto };
  }

  // ── Stats del turno ─────────────────────────────────────────────
  async getStats(restaurantId: number, chefId: number) {
    const session = await this.sessionRepo.findOne({
      where:  { chef: { id: chefId }, restaurant: { id: restaurantId }, endedAt: null },
      order:  { startedAt: 'DESC' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = await this.orderRepo.count({
      where: {
        restaurant: { id: restaurantId },
        kitchenStatus: KitchenStatus.DELIVERED,
        createdAt: MoreThanOrEqual(today),
      },
    });

    // Calcular tiempo promedio de preparación (en minutos)
    const recentItems = await this.itemRepo.find({
      where: {
        order: { restaurant: { id: restaurantId } },
        status: ItemStatus.READY,
        startedAt: Not(IsNull()),
        readyAt: MoreThanOrEqual(today),
      },
    });

    let avgPrepTimeMin = 0;
    if (recentItems.length > 0) {
      const totalMs = recentItems.reduce((acc, item) => {
        return acc + (item.readyAt.getTime() - item.startedAt.getTime());
      }, 0);
      avgPrepTimeMin = (totalMs / recentItems.length) / 60000;
    }

    return {
      completedToday,
      avgPrepTimeMin,
      activeSession: session ? {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      } : null,
    };
  }

  // ── Sesiones de turno ───────────────────────────────────────────
  async startSession(restaurantId: number, chefId: number) {
    const existing = await this.sessionRepo.findOne({
      where: { chef: { id: chefId }, restaurantId, endedAt: null },
    });
    if (existing) {
      throw new BadRequestException('Ya tienes un turno activo');
    }

    const session = this.sessionRepo.create({
      chef:         { id: chefId },
      restaurantId,
      startedAt:    new Date(),
    });
    return this.sessionRepo.save(session);
  }

  async endSession(sessionId: number, chefId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, chef: { id: chefId } },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.endedAt) throw new BadRequestException('La sesión ya fue cerrada');

    await this.sessionRepo.update(sessionId, { endedAt: new Date() });
    return this.sessionRepo.findOneBy({ id: sessionId });
  }

  // ── Historial de comandas ─────────────────────────────────────────
  async getOrdersHistory(restaurantId: number, date?: string) {
    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.dish', 'dish')
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.waiter', 'waiter')
      .where('order.restaurant = :restaurantId', { restaurantId })
      .andWhere('order.archivedInKitchen = :archived', { archived: false });

    // Por defecto mostrar entregados y cancelados
    qb.andWhere('(order.status = :s1 OR order.status = :s2 OR order.kitchenStatus = :ks)', {
      s1: 'delivered',
      s2: 'cancelled',
      ks: 'delivered',
    });

    if (date) {
      // Filtrar por una fecha específica (YYYY-MM-DD)
      qb.andWhere('DATE(order.createdAt) = :date', { date });
    } else {
      // Por defecto todo lo de HOY (desde las 00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      qb.andWhere('order.createdAt >= :today', { today });
    }

    qb.orderBy('order.createdAt', 'DESC');
    const orders = await qb.getMany();
    return orders.map(o => this.mapToKitchenOrderDto(o));
  }

  async archiveOrder(orderId: number, restaurantId: number) {
    const order = await this.orderRepo.findOneBy({ id: orderId, restaurant: { id: restaurantId } } as any);
    if (!order) throw new NotFoundException('Comanda no encontrada');

    await this.orderRepo.update(orderId, { archivedInKitchen: true });
    return { success: true, message: 'Comanda archivada del historial de cocina' };
  }

  async archiveAllHistory(restaurantId: number) {
    // Archiva todos los que ya están entregados/cancelados
    await this.orderRepo.createQueryBuilder()
      .update(Order)
      .set({ archivedInKitchen: true })
      .where('restaurant_id = :restaurantId', { restaurantId })
      .andWhere('(status = :s1 OR status = :s2 OR kitchen_status = :ks)', {
        s1: 'delivered',
        s2: 'cancelled',
        ks: 'delivered',
      })
      .execute();

    return { success: true, message: 'Todo el historial ha sido archivado' };
  }
}
