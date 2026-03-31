// RUTA: src/modules/inventory/entities/inventory-movement.entity.ts
import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId,
} from 'typeorm';
import { InventoryLot } from './inventory-lot.entity';
import { User }         from '../../users/entities/user.entity';

export enum MovementType {
  SALE       = 'sale',        // descuento por pedido (trigger FIFO)
  WASTE      = 'waste',       // merma
  ADJUSTMENT = 'adjustment',  // ajuste manual post-auditoría
  ENTRY      = 'entry',       // entrada de mercancía (nuevo lote)
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;

  @ManyToOne(() => InventoryLot, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lot_id' })
  lot: InventoryLot;
  @RelationId((mov: InventoryMovement) => mov.lot)
  lotId: number;

  // order_id nullable — solo para movimientos tipo 'sale'
  @Column({ name: 'order_id', unsigned: true, nullable: true })
  orderId: number | null;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  /** cantidad descontada o añadida */
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ length: 255, nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;
  @RelationId((mov: InventoryMovement) => mov.createdBy)
  createdById: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
