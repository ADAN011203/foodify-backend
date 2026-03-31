// RUTA: src/modules/inventory/entities/inventory-lot.entity.ts
//
// Corresponde a la entidad "Lote" de Jorge:
//   nombreInsumo  → item.name (FK)
//   cantidad      → quantity / remaining
//   unidadMedida  → item.unit
//   fechaCaducidad→ expiry_date
//   estado        → status (calculado)
//   proveedor     → supplier
//
// FIFO: el trigger MySQL after_order_delivered descuenta del lote
// con entry_date más antiguo (entry_date ASC).
import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum LotStatus {
  AVAILABLE = 'available',
  LOW       = 'low',
  CRITICAL  = 'critical',
  EXPIRED   = 'expired',
  DEPLETED  = 'depleted',
}

@Entity('inventory_lots')
export class InventoryLot {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;

  @ManyToOne(() => InventoryItem, item => item.lots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;
  @RelationId((lot: InventoryLot) => lot.item)
  itemId: number;

  @Column({ name: 'lot_number', length: 50, nullable: true })
  lotNumber: string | null;

  /** cantidad inicial del lote */
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  /** cantidad disponible (decrece con pedidos via trigger FIFO) */
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  remaining: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 4 })
  unitCost: number;

  /** proveedor del lote — campo "proveedor" de Jorge */
  @Column({ length: 120, nullable: true })
  supplier: string | null;

  /** fecha de ingreso al almacén — clave FIFO (entry_date ASC = más antiguo primero) */
  @Column({ name: 'entry_date', type: 'date' })
  entryDate: Date;

  /**
   * fechaCaducidad de Jorge.
   * Alerta automática cuando expiry_date <= NOW() + 7 días.
   * Jorge usa formato dd/MM/yyyy — el backend convierte en el DTO.
   */
  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  /**
   * estado calculado — Jorge necesita estos valores:
   *   available → "Disponible"       (verde)
   *   low       → "Próximo a caducar" (amarillo) cuando expiry <= 7 días
   *   critical  → "Stock crítico"    (naranja)
   *   expired   → "Caducado"         (rojo)
   *   depleted  → "Sin stock"        (gris)
   */
  @Column({
    type: 'enum',
    enum: LotStatus,
    default: LotStatus.AVAILABLE,
  })
  status: LotStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
