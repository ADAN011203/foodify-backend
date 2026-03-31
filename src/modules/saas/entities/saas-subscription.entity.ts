/**
 * RUTA: src/modules/saas/entities/saas-subscription.entity.ts
 */
import {
  Column, CreateDateColumn, Entity,
  JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { SaasPlan }   from './saas-plan.entity';

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled';

@Entity('saas_subscriptions')
export class SaasSubscription {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToOne(() => SaasPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: SaasPlan;

  @Column({
    type: 'enum',
    enum: ['trial', 'active', 'past_due', 'suspended', 'cancelled'],
    default: 'trial',
  })
  status: SubscriptionStatus;

  @Column({ name: 'amount_mxn', type: 'decimal', precision: 10, scale: 2 })
  amountMxn: number;

  @Column({ name: 'billing_cycle_day', type: 'tinyint', default: 1 })
  billingCycleDay: number;

  @Column({ name: 'trial_ends_at', nullable: true })
  trialEndsAt: Date | null;

  @Column({ name: 'next_billing_at' })
  nextBillingAt: Date;

  @Column({ name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
