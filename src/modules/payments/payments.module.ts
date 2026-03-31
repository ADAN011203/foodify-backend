// RUTA: src/modules/payments/payments.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { WebhookLog }         from './entities/webhook-log.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([WebhookLog])],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
