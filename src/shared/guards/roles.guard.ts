/**
 * RUTA: src/shared/guards/roles.guard.ts
 * Valida que el usuario autenticado tenga el rol requerido por @Roles().
 * v3.2: sin referencias al rol 'manager'.
 */
import {
  CanActivate, ExecutionContext,
  ForbiddenException, Injectable,
} from '@nestjs/common';
import { Reflector }       from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No autenticado');

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Rol no autorizado para este recurso');
    }
    return true;
  }
}
