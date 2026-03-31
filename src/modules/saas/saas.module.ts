// RUTA: src/modules/saas/saas.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaasController }     from './saas.controller';
import { SaasService }        from './saas.service';
import { SaasSubscription }   from './entities/saas-subscription.entity';
import { SaasPlan }           from './entities/saas-plan.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Restaurant }         from '../restaurants/entities/restaurant.entity';
import { User }               from '../users/entities/user.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([SaasSubscription, SaasPlan, PaymentTransaction, Restaurant, User])],
  controllers: [SaasController],
  providers:   [SaasService],
  exports:     [SaasService],
})
export class SaasModule {}
