/**
 * RUTA: src/modules/users/entities/user.entity.ts
 *
 * v3.2 — CAMBIOS:
 *   - UserRole ENUM sin 'manager'
 *   - fcmToken: solo App Android (waiter/chef/cashier/admin en Premium)
 */
import {
  Column, CreateDateColumn, Entity,
  JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

/**
 * Roles del sistema — v3.2
 *
 * Plataformas:
 *   saas_admin       → PWA CODEX (saas.foodify.mx)
 *   restaurant_admin → PWA (dashboard + config) + App Android Premium (operación)
 *   cashier          → App Android — Solo Plan Premium
 *   waiter           → App Android — Solo Plan Premium
 *   chef             → App Android — Solo Plan Premium
 *
 * ELIMINADO: 'manager' — sus funciones fueron absorbidas por restaurant_admin
 */
export enum UserRole {
  SAAS_ADMIN       = 'saas_admin',
  RESTAURANT_ADMIN = 'restaurant_admin',
  WAITER           = 'waiter',
  CHEF             = 'chef',
  CASHIER          = 'cashier',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  /**
   * NULL solo para saas_admin (no pertenece a ningún restaurante)
   */
  @ManyToOne(() => Restaurant, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant | null;

  @RelationId((user: User) => user.restaurant)
  restaurantId: number | null;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'full_name', length: 120 })
  fullName: string;

  @Column({ length: 190, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  /**
   * Token FCM para push notifications Android.
   * Solo lo tienen: waiter, chef, cashier, restaurant_admin en Plan Premium.
   * NULL para restaurant_admin en Plan Básico (solo usa PWA).
   * Actualizable vía PATCH /auth/fcm-token desde la App Android.
   */
  @Column({ name: 'fcm_token', length: 255, nullable: true })
  fcmToken: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
