// RUTA: src/modules/menus/entities/menu.entity.ts
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId } from 'typeorm';
import { Restaurant }    from '../../restaurants/entities/restaurant.entity';
import { MenuCategory }  from '../../categories/entities/menu-category.entity';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @RelationId((menu: Menu) => menu.restaurant)
  restaurantId: number;
  @Column({ length: 100 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  /** { days:[1,2,3,4,5], start:"12:00", end:"16:00" } */
  @Column({ type: 'json', nullable: true }) schedule: object | null;
  @Column({ name: 'sort_order', type: 'smallint', default: 0 }) sortOrder: number;
  /**
   * allow_outside_schedule — v3.1
   * true (default): acepta pedidos fuera del horario definido
   * false: solo acepta pedidos dentro del horario
   */
  @Column({ name: 'allow_outside_schedule', type: 'tinyint', default: 1 }) allowOutsideSchedule: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @OneToMany(() => MenuCategory, cat => cat.menu) categories: MenuCategory[];
}
