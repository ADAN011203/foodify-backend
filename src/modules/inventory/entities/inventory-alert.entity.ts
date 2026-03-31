// RUTA: src/modules/inventory/entities/inventory-alert.entity.ts
import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum AlertType {
  LOW_STOCK     = 'low_stock',
  EXPIRING_SOON = 'expiring_soon',  // Jorge: "Próximo a caducar"
  EXPIRED       = 'expired',        // Jorge: "Caducado"
  OUT_OF_STOCK  = 'out_of_stock',
}

@Entity('inventory_alerts')
export class InventoryAlert {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;

  @ManyToOne(() => InventoryItem, item => item.alerts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;
  @RelationId((alert: InventoryAlert) => alert.item)
  itemId: number;

  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @Column({ length: 255 })
  message: string;

  @Column({ name: 'is_resolved', default: false })
  isResolved: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
