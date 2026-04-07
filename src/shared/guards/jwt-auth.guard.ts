/**
 * RUTA: src/shared/guards/jwt-auth.guard.ts
 * Extiende AuthGuard('jwt') respetando el decorador @Public().
 */
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector }                    from '@nestjs/core';
import { AuthGuard }                    from '@nestjs/passport';
import { IS_PUBLIC_KEY }                from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const request = ctx.switchToHttp().getRequest();
    request.isPublicEndpoint = isPublic;

    return super.canActivate(ctx);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    if (request.isPublicEndpoint) {
      return user || null;
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
