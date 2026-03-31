// RUTA: src/modules/restaurants/entities/restaurant.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Menu } from '../../menus/entities/menu.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;
  @RelationId((restaurant: Restaurant) => restaurant.owner)
  ownerId: number;

  @Column({ length: 120 }) name: string;
  @Column({ length: 120, unique: true }) slug: string;
  @Column({ name: 'logo_url', length: 255, nullable: true }) logoUrl: string | null;
  @Column({ length: 255, nullable: true }) address: string | null;
  @Column({ length: 50, default: 'America/Monterrey' }) timezone: string;
  @Column({ type: 'char', length: 3, default: 'MXN' }) currency: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  /**
   * dashboard_config: toggles de las 5 gráficas del dashboard PWA.
   * { show_sales, show_top_dishes, show_peak_hours, show_category_income, show_dishes_by_menu }
   */
  @Column({ name: 'dashboard_config', type: 'json', nullable: true }) dashboardConfig: Record<string, boolean> | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @OneToMany(() => Menu, (menu) => menu.restaurant)
  menus: Menu[];
}
