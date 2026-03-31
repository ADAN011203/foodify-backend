// RUTA: src/modules/payments/entities/webhook-log.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @Column({ length: 50 }) gateway: string;
  @Column({ length: 100, nullable: true }) eventType: string | null;
  @Column({ type: 'json', nullable: true }) payload: object | null;
  @Column({ length: 20, default: 'received' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
