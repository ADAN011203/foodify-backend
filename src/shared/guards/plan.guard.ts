/**
 * RUTA: src/shared/guards/plan.guard.ts
 *
 * Guard global (APP_GUARD) que valida estado de suscripción y plan
 * en CADA petición autenticada.
 *
 * Reglas v3.2:
 *   - saas_admin:          siempre permitido
 *   - @Public():           siempre permitido (sin JWT)
 *   - suspended/cancelled: 403 en todo
 *   - past_due:            solo GET permitido (a menos que @AllowReadOnly)
 *   - waiter/chef/cashier: 403 si el plan NO es Premium
 *   - @RequireFeature(X):  403 si la feature no está en el plan
 */
import {
  CanActivate, ExecutionContext,
  ForbiddenException, Injectable,
} from '@nestjs/common';
import { Reflector }        from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';

import {
  ALLOW_READ_ONLY_KEY,
  IS_PUBLIC_KEY,
  PREMIUM_ONLY_ROLES,
  Role,
} from '../decorators/roles.decorator';
import {
  REQUIRE_FEATURE_KEY,
  PlanFeature,
  PREMIUM_PLAN_FEATURES,
} from '../decorators/require-feature.decorator';
import { SaasSubscription } from '../../modules/saas/entities/saas-subscription.entity';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(SaasSubscription)
    private subRepo: Repository<SaasSubscription>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // 1. Rutas públicas — sin validación de plan
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req  = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // JwtAuthGuard maneja la autenticación

    // 2. saas_admin siempre permitido
    if (user.role === Role.SAAS_ADMIN) return true;

    // 3. Obtener suscripción del restaurante
    const sub = await this.subRepo.findOne({
      where: { restaurant: { id: user.restaurantId } },
      relations: ['plan'],
      select: {
        id: true, status: true,
        plan: { id: true, name: true, features: true },
      },
    });
    if (!sub) throw new ForbiddenException('Sin suscripción activa');

    // 4. Estados bloqueantes
    if (sub.status === 'suspended') {
      throw new ForbiddenException('ACCOUNT_SUSPENDED');
    }
    if (sub.status === 'cancelled') {
      throw new ForbiddenException('ACCOUNT_CANCELLED');
    }

    // 5. past_due: solo GET
    if (sub.status === 'past_due') {
      const allowReadOnly = this.reflector.getAllAndOverride<boolean>(
        ALLOW_READ_ONLY_KEY, [ctx.getHandler(), ctx.getClass()],
      );
      const method = req.method as string;
      if (!allowReadOnly && method !== 'GET') {
        throw new ForbiddenException('PAYMENT_OVERDUE');
      }
    }

    // 6. Roles Premium-only (waiter, chef, cashier)
    const isPremium = sub.plan?.name?.toLowerCase().includes('premium') ?? false;
    if (PREMIUM_ONLY_ROLES.includes(user.role as Role) && !isPremium) {
      throw new ForbiddenException(
        `El rol '${user.role}' requiere Plan Premium`,
      );
    }

    // 7. @RequireFeature
    const requiredFeature = this.reflector.getAllAndOverride<PlanFeature>(
      REQUIRE_FEATURE_KEY, [ctx.getHandler(), ctx.getClass()],
    );
    if (requiredFeature && PREMIUM_PLAN_FEATURES.includes(requiredFeature) && !isPremium) {
      throw new ForbiddenException(
        `La feature '${requiredFeature}' requiere Plan Premium`,
      );
    }

    return true;
  }
}
