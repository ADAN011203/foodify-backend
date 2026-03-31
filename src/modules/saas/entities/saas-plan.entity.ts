// RUTA: src/modules/saas/entities/saas-plan.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('saas_plans')
export class SaasPlan {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @Column({ length: 80 }) name: string;
  @Column({ name: 'price_mxn', type: 'decimal', precision: 10, scale: 2 }) priceMxn: number;
  @Column({ name: 'max_branches', type: 'tinyint', default: 1 }) maxBranches: number;
  @Column({ name: 'max_menus', type: 'tinyint', default: 2 }) maxMenus: number;
  @Column({ type: 'json' }) features: string[];
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
