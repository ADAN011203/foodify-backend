/**
 * RUTA: src/modules/orders/entities/order.entity.ts
 *
 * v3.2 — CAMPOS NUEVOS:
 *   - qrCode:        QR único para órdenes takeout (Para Llevar)
 *   - customerName:  Nombre del comensal (Para Llevar desde PWA pública, sin JWT)
 *   - customerPhone: Teléfono del comensal (Para Llevar desde PWA pública)
 *
 * Flujo takeout:
 *   Plan Básico  → admin confirma entrega manualmente desde PWA
 *   Plan Premium → waiter/cashier escanea QR con App Android (PATCH /orders/:id/scan-qr)
 */
import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Table }      from '../../tables/entities/table.entity';
import { User }       from '../../users/entities/user.entity';
import { OrderItem }  from './order-item.entity';

export enum OrderType {
  DINE_IN  = 'dine_in',   // en restaurante — waiter crea desde App Android
  TAKEOUT  = 'takeout',   // para llevar  — comensal crea desde PWA pública
  DELIVERY = 'delivery',
}

export enum OrderStatus {
  PENDING   = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY     = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum KitchenStatus {
  PENDING   = 'pending',
  PREPARING = 'preparing',
  READY     = 'ready',
  DELIVERED = 'delivered',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @RelationId((o: Order) => o.restaurant)
  restaurantId: number;

  /** NULL para órdenes takeout creadas por el comensal */
  @ManyToOne(() => Table, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'table_id' })
  table: Table | null;

  @RelationId((o: Order) => o.table)
  tableId: number | null;

  /** NULL para órdenes takeout creadas desde PWA pública sin JWT */
  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'waiter_id' })
  waiter: User | null;

  @RelationId((o: Order) => o.waiter)
  waiterId: number | null;

  /** Folio visible al cliente: 0001-9999 */
  @Column({ name: 'order_number', type: 'char', length: 4 })
  orderNumber: string;

  @Column({ type: 'enum', enum: OrderType, default: OrderType.DINE_IN })
  type: OrderType;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  /**
   * Estado visible en cocina — separado del estado general.
   * Manejado por el chef desde App Android (Solo Premium).
   */
  @Column({
    name: 'kitchen_status',
    type: 'enum',
    enum: KitchenStatus,
    default: KitchenStatus.PENDING,
  })
  kitchenStatus: KitchenStatus;

  // ── Campos nuevos v3.2 ── Para Llevar desde PWA pública ────────────────────

  /**
   * QR único generado al crear una orden con type=takeout.
   * Contiene el folio o un token único para validación.
   *
   * Plan Básico:  el admin ignora este campo y confirma manualmente desde PWA.
   * Plan Premium: waiter o cashier escanea este QR desde App Android.
   *               → PATCH /api/v1/orders/:id/scan-qr cambia status=delivered.
   *
   * NULL para órdenes dine_in.
   */
  @Column({ name: 'qr_code', length: 500, nullable: true })
  qrCode: string | null;

  /**
   * Nombre del comensal para órdenes Para Llevar creadas desde PWA pública.
   * El comensal lo ingresa en el checkout junto con su teléfono.
   * NULL para órdenes dine_in creadas por waiter con JWT.
   */
  @Column({ name: 'customer_name', length: 120, nullable: true })
  customerName: string | null;

  /**
   * Teléfono del comensal para órdenes Para Llevar.
   * Permite al restaurante contactar al cliente si hay algún problema.
   */
  @Column({ name: 'customer_phone', length: 20, nullable: true })
  customerPhone: string | null;

  // ── Campos financieros ────────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'tip_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  tipAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Al llegar a 'delivered' dispara trigger FIFO de inventario */
  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancel_reason', length: 255, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
