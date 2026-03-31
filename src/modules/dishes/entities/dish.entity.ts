// RUTA: src/modules/dishes/entities/dish.entity.ts
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId } from 'typeorm';
import { Restaurant }  from '../../restaurants/entities/restaurant.entity';
import { MenuCategory } from '../../categories/entities/menu-category.entity';

@Entity('dishes')
export class Dish {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
  @RelationId((dish: Dish) => dish.restaurant)
  restaurantId: number;

  @ManyToOne(() => MenuCategory, cat => cat.dishes, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: MenuCategory | null;
  @RelationId((dish: Dish) => dish.category)
  categoryId: number | null;
  @Column({ length: 120 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) price: number;
  @Column({ name: 'cost_est', type: 'decimal', precision: 10, scale: 2, default: 0 }) costEst: number;
  @Column({ name: 'margin_pct', type: 'decimal', precision: 5, scale: 2, generatedType: 'STORED', asExpression: '((`price` - `cost_est`) / `price`) * 100' }) marginPct: number;
  @Column({ name: 'prep_time_min', type: 'tinyint', default: 15 }) prepTimeMin: number;
  @Column({ name: 'is_available', default: true }) isAvailable: boolean;
  @Column({ type: 'json', nullable: true }) images: string[] | null;
  @Column({ type: 'json', nullable: true }) allergens: string[] | null;
  @Column({ name: 'sort_order', type: 'smallint', default: 0 }) sortOrder: number;
  @Column({ name: 'deleted_at', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
