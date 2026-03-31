// RUTA: src/modules/saas/entities/payment-transaction.entity.ts
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SaasSubscription } from './saas-subscription.entity';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @ManyToOne(() => SaasSubscription, { onDelete: 'RESTRICT' }) subscription: SaasSubscription;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'char', length: 3, default: 'MXN' }) currency: string;
  @Column({ type: 'enum', enum: ['success','failed','refunded','dispute','pending'] }) status: string;
  @Column({ name: 'payment_method', length: 50, nullable: true }) paymentMethod: string | null;
  @Column({ name: 'gateway_ref', length: 100, nullable: true, unique: true }) gatewayRef: string | null;
  @Column({ name: 'paid_at', nullable: true }) paidAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
