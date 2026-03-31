// RUTA: src/modules/inventory/entities/inventory-item.entity.ts
//
// Corresponde a la entidad "Insumo" de Jorge:
//   nombreInsumo  → name
//   unidadMedida  → unit (Kg, L, Pz)
//   proveedor     → en inventory_lots (por lote)
//
// Solo Plan Premium.
import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId,
} from 'typeorm';
import { Restaurant }     from '../../restaurants/entities/restaurant.entity';
import { InventoryLot }   from './inventory-lot.entity';
import { InventoryAlert } from './inventory-alert.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
  @RelationId((item: InventoryItem) => item.restaurant)
  restaurantId: number;

  /** nombre del insumo — ej: "Harina", "Tomate", "Carne" */
  @Column({ length: 120 })
  name: string;

  /** unidad base — Kg, g, L, ml, Pz (Jorge usa: Kg, L, Pz) */
  @Column({ length: 20 })
  unit: string;

  /** stock mínimo antes de generar alerta */
  @Column({ name: 'min_stock', type: 'decimal', precision: 10, scale: 3, default: 0 })
  minStock: number;

  /** stock actual calculado (suma de lotes activos) */
  @Column({ name: 'current_stock', type: 'decimal', precision: 10, scale: 3, default: 0 })
  currentStock: number;

  /** clasificación — Carnes, Lácteos, Verduras, etc. */
  @Column({ length: 60, nullable: true })
  category: string | null;

  @Column({ name: 'image_url', length: 255, nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => InventoryLot, lot => lot.item)
  lots: InventoryLot[];

  @OneToMany(() => InventoryAlert, alert => alert.item)
  alerts: InventoryAlert[];
}
