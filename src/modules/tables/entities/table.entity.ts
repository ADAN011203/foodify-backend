// RUTA: src/modules/tables/entities/table.entity.ts
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED  = 'occupied',
  RESERVED  = 'reserved',
  CLEANING  = 'cleaning',
}

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' }) restaurant: Restaurant;
  @Column({ name: 'restaurant_id', unsigned: true }) restaurantId: number;
  @Column({ type: 'smallint' }) number: number;
  @Column({ type: 'tinyint', default: 4 }) capacity: number;
  @Column({ name: 'qr_code_url', length: 255, nullable: true }) qrCodeUrl: string | null;
  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE }) status: TableStatus;
}
