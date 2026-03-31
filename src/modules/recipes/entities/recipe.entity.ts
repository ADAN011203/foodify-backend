// RUTA: src/modules/recipes/entities/recipe.entity.ts
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Dish } from '../../dishes/entities/dish.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @OneToOne(() => Dish, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'dish_id' }) dish: Dish;
  @Column({ name: 'dish_id', unsigned: true, unique: true }) dishId: number;
  @Column({ name: 'prep_time_min', type: 'tinyint', default: 15 }) prepTimeMin: number;
  @Column({ type: 'tinyint', default: 1 }) servings: number;
  @Column({ type: 'json', nullable: true }) steps: Array<{ order: number; description: string }> | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @OneToMany(() => RecipeIngredient, ing => ing.recipe, { cascade: true }) ingredients: RecipeIngredient[];
}
