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
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';

import { Order, KitchenStatus }  from '../orders/entities/order.entity';
import { OrderItem, ItemStatus } from '../orders/entities/order-item.entity';
import { KitchenSession }        from './entities/kitchen-session.entity';
import { KitchenGateway }        from './kitchen.gateway';
import { OrdersGateway }         from '../orders/orders.gateway';
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
    private ordersGateway: OrdersGateway,
  ) {}

  // ── Comandas activas ────────────────────────────────────────────
  getActiveOrders(restaurantId: number) {
    return this.orderRepo.find({
      where: [
        { restaurantId, kitchenStatus: KitchenStatus.PENDING },
        { restaurantId, kitchenStatus: KitchenStatus.PREPARING },
        { restaurantId, kitchenStatus: KitchenStatus.READY },
      ],
      relations: ['items', 'items.dish', 'table', 'waiter'],
      order:     { createdAt: 'ASC' },
    });
  }

  async getOrder(id: number, restaurantId: number) {
    const order = await this.orderRepo.findOne({
      where:     { id, restaurantId },
      relations: ['items', 'items.dish', 'table', 'waiter'],
    });
    if (!order) throw new NotFoundException('Comanda no encontrada');
    return order;
  }

  // ── Cambiar estado de comanda completa ──────────────────────────
  async updateOrderStatus(
    id: number,
    restaurantId: number,
    dto: UpdateKitchenStatusDto,
  ) {
    const order = await this.getOrder(id, restaurantId);

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
    // Delega al módulo de dishes — aquí retornamos con receta resumida
    return { message: 'Ver DishesService.findAll con recetas resumidas', restaurantId };
  }

  async getRecipe(dishId: number, restaurantId: number) {
    return { message: 'Ver RecipesService.findByDish', dishId, restaurantId };
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
      where:  { chef: { id: chefId }, restaurantId, endedAt: null },
      order:  { startedAt: 'DESC' },
    });

    const completedOrders = await this.orderRepo.count({
      where: {
        restaurantId,
        kitchenStatus: KitchenStatus.DELIVERED,
      },
    });

    return {
      sessionActive:   !!session,
      sessionStartedAt: session?.startedAt ?? null,
      completedOrders,
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
}
