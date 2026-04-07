/**
 * RUTA: src/modules/orders/orders.service.ts
 *
 * v3.2 — CAMBIOS:
 *   - createOrder: acepta requests sin JWT (takeout desde PWA pública)
 *     genera QR único y guarda customerName / customerPhone
 *   - scanQr: nuevo método para PATCH /orders/:id/scan-qr (Solo Premium)
 *   - confirmDeliveryManual: para Plan Básico — admin confirma desde PWA
 *   - validateOrderSchedule: valida horario de cada platillo antes de crear
 *   - Sin referencias al rol 'manager'
 */
import {
  BadRequestException, ForbiddenException,
  Injectable, InternalServerErrorException, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as QRCode from 'qrcode';

import { Order, OrderStatus, OrderType, KitchenStatus } from './entities/order.entity';
import { OrderItem, ItemStatus }                         from './entities/order-item.entity';
import { Table }                                         from '../tables/entities/table.entity';
import { Dish }                                          from '../dishes/entities/dish.entity';
import { CreateOrderDto }                                from './dto/create-order.dto';
import {
  UpdateOrderStatusDto, AddOrderItemDto,
  UpdateOrderItemDto, ScanQrDto,
}                                                        from './dto/update-order.dto';
import { OrdersGateway }                                 from './orders.gateway';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectRepository(Order)      private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)  private itemRepo: Repository<OrderItem>,
    @InjectRepository(Dish)       private dishRepo: Repository<Dish>,
    private dataSource: DataSource,
    private ordersGateway: OrdersGateway,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CREAR ORDEN
  // Dos orígenes posibles:
  //   1. App Android (JWT) → dine_in  — waiter/restaurant_admin
  //   2. PWA Pública (sin JWT) → takeout — comensal
  // ─────────────────────────────────────────────────────────────────────────
  async createOrder(
    dto: CreateOrderDto,
    restaurantId: number,
    waiterId: number | null,   // null cuando viene de PWA pública sin JWT
  ): Promise<Order> {
    // Normalizar snake_case de Android
    if (dto.table_id === 0) dto.table_id = undefined;
    dto.tableId = dto.tableId || dto.table_id;
    
    dto.items = dto.items.map(i => ({
      ...i,
      dishId: i.dishId || i.dish_id,
      specialNotes: i.specialNotes || i.special_notes,
    }));

    if (dto.tableId) {
      dto.type = OrderType.DINE_IN;
    } else {
      dto.type = OrderType.TAKEOUT;
    }

    // Validar que takeout público tenga nombre y teléfono
    if (dto.type === OrderType.TAKEOUT && !waiterId) {
      if (!dto.customerName || !dto.customerPhone) {
        throw new BadRequestException(
          'Para órdenes Para Llevar se requiere nombre y teléfono del cliente',
        );
      }
    }

    // Validar platillos
    await this.validateOrderSchedule(dto.items.map((i) => i.dishId), restaurantId);

    // Generar folio único 0001-9999
    const count = await this.orderRepo.count({ where: { restaurant: { id: restaurantId } } });
    const orderNumber = String((count % 9999) + 1).padStart(4, '0');

    // Generar QR para takeout
    let qrCode: string | null = null;
    if (dto.type === OrderType.TAKEOUT) {
      const token = `FOODIFY-${restaurantId}-${orderNumber}-${Date.now()}`;
      qrCode = await QRCode.toDataURL(token);
    }

    return this.dataSource.transaction(async (em) => {
      // Calcular precios
      const itemsWithPrice = await Promise.all(
        dto.items.map(async (item) => {
          const dish = await em.findOneBy(Dish, { id: item.dishId });
          if (!dish || !dish.isAvailable) {
            throw new BadRequestException(
              `El platillo #${item.dishId} no está disponible`,
            );
          }
          return { ...item, unitPrice: dish.price };
        }),
      );

      // Validar mesa
      if (dto.tableId) {
        const table = await em.findOneBy(Table, { id: dto.tableId, restaurant: { id: restaurantId } } as any);
        if (!table) throw new BadRequestException('Mesa no encontrada o inválida');
        await em.update(Table, { id: dto.tableId }, { status: 'occupied' as any });
      }

      const subtotal = itemsWithPrice.reduce(
        (acc, i) => acc + i.unitPrice * i.quantity, 0,
      );
      const taxAmount = subtotal * 0.16;
      const total     = subtotal + taxAmount;

      const order = em.create(Order, {
        restaurant: { id: restaurantId } as any,
        table:         dto.tableId ? { id: dto.tableId } as any : null,
        waiter:        waiterId ? { id: waiterId } as any : null,
        orderNumber,
        type:          dto.type,
        status:        OrderStatus.PENDING,
        kitchenStatus: KitchenStatus.PENDING,
        qrCode,
        customerName:  dto.customerName  ?? null,
        customerPhone: dto.customerPhone ?? null,
        notes:         dto.notes         ?? null,
        subtotal,
        taxAmount,
        total,
      });
      const savedOrder = await em.save(Order, order);

      const orderItems = itemsWithPrice.map((i) =>
        em.create(OrderItem, {
          orderId:      savedOrder.id,
          dishId:       i.dishId,
          quantity:     i.quantity,
          unitPrice:    i.unitPrice,
          specialNotes: i.specialNotes ?? null,
          status:       ItemStatus.PENDING,
        }),
      );
      await em.save(OrderItem, orderItems);

      // Emitir a namespace /kitchen (Solo Premium — el gateway valida)
      this.ordersGateway.emitNewOrder(restaurantId, {
        orderId:      savedOrder.id,
        tableNumber:  dto.tableId ?? null,
        waiterName:   waiterId ? 'Mesero' : dto.customerName,
        orderNumber,
        type:         dto.type,
        items:        orderItems.map((i) => ({
          id: i.id, dishId: i.dishId, quantity: i.quantity,
          specialNotes: i.specialNotes,
        })),
        createdAt: savedOrder.createdAt,
      });

      return em.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items', 'table', 'waiter'],
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCAN QR — Solo Plan Premium (App Android: waiter o cashier)
  // PATCH /api/v1/orders/:id/scan-qr
  // ─────────────────────────────────────────────────────────────────────────
  async scanQr(orderId: number, restaurantId: number): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, restaurant: { id: restaurantId } },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    if (order.type !== OrderType.TAKEOUT) {
      throw new BadRequestException(
        'El escaneo de QR solo aplica para órdenes Para Llevar',
      );
    }
    if (!order.qrCode) {
      throw new BadRequestException('Esta orden no tiene QR generado');
    }
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('La orden ya fue entregada');
    }

    await this.orderRepo.update(orderId, {
      status:      OrderStatus.DELIVERED,
      deliveredAt: new Date(),
    });

    if (order.tableId) {
      await this.dataSource.manager.update(Table, { id: order.tableId }, { status: 'available' as any });
    }

    // El trigger MySQL after_order_delivered descontará el inventario FIFO
    // Emitir evento al namespace /restaurant
    this.ordersGateway.emitOrderDelivered(restaurantId, {
      orderId, deliveredAt: new Date(), total: order.total,
    });

    return this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIRMAR ENTREGA MANUAL — Plan Básico (admin desde PWA)
  // Se usa el endpoint PATCH /orders/:id/status con status=delivered
  // ─────────────────────────────────────────────────────────────────────────
  async updateStatus(
    orderId: number,
    restaurantId: number,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id: orderId, restaurant: { id: restaurantId } } as any);
    if (!order) throw new NotFoundException('Orden no encontrada');

    // Validar transición de estados (sin retrocesos)
    const validTransitions: Record<string, string[]> = {
      [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]:     [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[order.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Transición inválida: ${order.status} → ${dto.status}`,
      );
    }

    const updates: Partial<Order> = { status: dto.status as OrderStatus };
    if (dto.status === OrderStatus.DELIVERED) {
      updates.deliveredAt = new Date();
      this.ordersGateway.emitOrderDelivered(restaurantId, {
        orderId, deliveredAt: updates.deliveredAt, total: order.total,
      });
    }
    if (dto.status === OrderStatus.CANCELLED) {
      updates.cancelledAt  = new Date();
      updates.cancelReason = dto.cancelReason ?? null;
    }

    await this.orderRepo.update(orderId, updates);
    
    if (dto.status === OrderStatus.DELIVERED || dto.status === OrderStatus.CANCELLED) {
      if (order.tableId) {
         await this.dataSource.manager.update(Table, { id: order.tableId }, { status: 'available' as any });
      }
    }
    
    return this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
  }

  private mapOrderRelations(order: Order): any {
    const o = order as any;
    if (o.table) {
      o.tableNumber = o.table.number;
    }
    if (o.items) {
      o.items = o.items.map((item: any) => {
        if (item.dish) {
          item.dishName = item.dish.name;
          item.dishImages = item.dish.images || null;
        }
        return item;
      });
    }
    return o;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LISTAR / DETALLE
  // ─────────────────────────────────────────────────────────────────────────
  async findAll(restaurantId: number, filters: {
    status?: string; kitchenStatus?: string;
    tableId?: number; waiterId?: number;
    dateFrom?: string; dateTo?: string;
  }) {
    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.dish', 'dish')
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.waiter', 'waiter')
      .where('order.restaurant = :restaurantId', { restaurantId });

    if (filters.status)        qb.andWhere('order.status = :status',              { status: filters.status });
    if (filters.kitchenStatus) qb.andWhere('order.kitchen_status = :ks',          { ks: filters.kitchenStatus });
    if (filters.tableId)       qb.andWhere('order.table_id = :tableId',           { tableId: filters.tableId });
    if (filters.waiterId)      qb.andWhere('order.waiter_id = :waiterId',         { waiterId: filters.waiterId });
    if (filters.dateFrom)      qb.andWhere('order.created_at >= :dateFrom',       { dateFrom: filters.dateFrom });
    if (filters.dateTo)        qb.andWhere('order.created_at <= :dateTo',         { dateTo: filters.dateTo });

    qb.orderBy('order.created_at', 'DESC');
    const orders = await qb.getMany();
    return orders.map(o => this.mapOrderRelations(o));
  }

  async findActive(restaurantId: number) {
    try {
      this.logger.debug(`findActive: restaurantId=${restaurantId}`);
      const statuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY];
      
      const orders = await this.orderRepo.createQueryBuilder('order')
        .leftJoinAndSelect('order.table', 'table')
        .leftJoinAndSelect('order.items', 'item')
        .leftJoinAndSelect('item.dish', 'dish')
        .leftJoinAndSelect('order.waiter', 'waiter')
        .where('order.restaurant = :restaurantId', { restaurantId })
        .andWhere('order.status IN (:...statuses)', { statuses })
        .orderBy('order.createdAt', 'ASC')
        .getMany();
        
      return orders.map(o => this.mapOrderRelations(o));
    } catch (err: any) {
      this.logger.error(
        `findActive FAILED for restaurantId=${restaurantId}: ${err?.message}`,
        err?.stack,
      );
      throw new InternalServerErrorException('Error al obtener pedidos activos');
    }
  }

  async findOne(id: number, restaurantId: number) {
    const order = await this.orderRepo.createQueryBuilder('order')
        .leftJoinAndSelect('order.table', 'table')
        .leftJoinAndSelect('order.items', 'item')
        .leftJoinAndSelect('item.dish', 'dish')
        .leftJoinAndSelect('order.waiter', 'waiter')
        .where('order.restaurant = :restaurantId', { restaurantId })
        .andWhere('order.id = :id', { id })
        .getOne();
        
    if (!order) throw new NotFoundException('Orden no encontrada');
    return this.mapOrderRelations(order);
  }

  async addItem(orderId: number, restaurantId: number, dto: AddOrderItemDto) {
    const order = await this.findOne(orderId, restaurantId);
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('No se pueden agregar ítems a una orden finalizada');
    }
    const dish = await this.dishRepo.findOneBy({ id: dto.dishId, restaurant: { id: restaurantId } } as any);
    if (!dish || !dish.isAvailable) throw new NotFoundException('Platillo no disponible');

    const item = this.itemRepo.create({
      orderId, dishId: dto.dishId, quantity: dto.quantity,
      unitPrice: dish.price, specialNotes: dto.specialNotes ?? null,
      status: ItemStatus.PENDING,
    });
    return this.itemRepo.save(item);
  }

  async updateItem(orderId: number, itemId: number, restaurantId: number, dto: UpdateOrderItemDto) {
    await this.findOne(orderId, restaurantId);
    await this.itemRepo.update({ id: itemId, orderId }, dto);
    return this.itemRepo.findOneBy({ id: itemId });
  }

  async removeItem(orderId: number, itemId: number, restaurantId: number) {
    await this.findOne(orderId, restaurantId);
    await this.itemRepo.delete({ id: itemId, orderId });
    return { message: 'Ítem eliminado' };
  }

  async cancel(orderId: number, restaurantId: number, cancelReason: string) {
    const order = await this.findOne(orderId, restaurantId);
    const result = await this.updateStatus(orderId, restaurantId, {
      status: OrderStatus.CANCELLED, cancelReason,
    } as UpdateOrderStatusDto);
    
    if (order.tableId) {
      await this.dataSource.manager.update(Table, { id: order.tableId }, { status: 'available' as any });
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDAR HORARIO DE PLATILLOS
  // Verifica que cada platillo sea ordenable según su schedule
  // ─────────────────────────────────────────────────────────────────────────
  private async validateOrderSchedule(dishIds: number[], restaurantId: number) {
    for (const dishId of dishIds) {
      const dish = await this.dishRepo.findOne({
        where: { id: dishId, restaurant: { id: restaurantId } } as any,
        relations: ['category', 'category.menu'],
      });
      if (!dish) throw new NotFoundException(`Platillo #${dishId} no encontrado`);
      if (!dish.isAvailable) {
        throw new BadRequestException(
          `El platillo "${dish.name}" no está disponible actualmente`,
        );
      }
      // TODO: validar schedule del menú y categoría con isMenuActiveNow()
    }
  }
}
