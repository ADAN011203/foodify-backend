/**
 * RUTA: src/modules/kitchen/entities/kitchen-session.entity.ts
 */
import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { User }       from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('kitchen_sessions')
export class KitchenSession {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'chef_id' })
  chef: User;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id', unsigned: true })
  restaurantId: number;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  /** NULL = turno activo */
  @Column({ name: 'ended_at', nullable: true })
  endedAt: Date | null;
}
