/**
 * RUTA: src/modules/orders/entities/order-item.entity.ts
 */
import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Dish }  from '../../dishes/entities/dish.entity';

export enum ItemStatus {
  PENDING   = 'pending',
  PREPARING = 'preparing',
  READY     = 'ready',
  SERVED    = 'served',
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id', unsigned: true })
  orderId: number;

  @ManyToOne(() => Dish, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'dish_id' })
  dish: Dish;

  @Column({ name: 'dish_id', unsigned: true })
  dishId: number;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({
    type: 'decimal', precision: 10, scale: 2,
    generatedType: 'STORED',
    asExpression: '`quantity` * `unit_price`',
  })
  subtotal: number;

  /** ★ MÓDULO COCINA: nota especial del mesero al chef */
  @Column({ name: 'special_notes', type: 'text', nullable: true })
  specialNotes: string | null;

  /** ★ MÓDULO COCINA: estado individual del ítem en cocina */
  @Column({ type: 'enum', enum: ItemStatus, default: ItemStatus.PENDING })
  status: ItemStatus;

  /** ★ MÓDULO COCINA: timestamp cuando el chef inicia este ítem */
  @Column({ name: 'started_at', nullable: true })
  startedAt: Date | null;

  /** ★ MÓDULO COCINA: timestamp cuando el ítem está listo */
  @Column({ name: 'ready_at', nullable: true })
  readyAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
