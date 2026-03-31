// RUTA: src/modules/categories/entities/menu-category.entity.ts
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId } from 'typeorm';
import { Menu }  from '../../menus/entities/menu.entity';
import { Dish }  from '../../dishes/entities/dish.entity';

@Entity('menu_categories')
export class MenuCategory {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @ManyToOne(() => Menu, menu => menu.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;
  @RelationId((cat: MenuCategory) => cat.menu)
  menuId: number;
  @Column({ length: 100 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ length: 50, nullable: true }) icon: string | null;
  @Column({ type: 'json', nullable: true }) schedule: object | null;
  @Column({ name: 'sort_order', type: 'smallint', default: 0 }) sortOrder: number;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @OneToMany(() => Dish, dish => dish.category) dishes: Dish[];
}
