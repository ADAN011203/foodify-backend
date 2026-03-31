/**
 * RUTA: src/modules/auth/strategies/jwt.strategy.ts
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy }                  from '@nestjs/passport';
import { ExtractJwt, Strategy }              from 'passport-jwt';
import { ConfigService }                     from '@nestjs/config';

export interface JwtPayload {
  sub:                number;
  email:              string;
  role:               string;
  restaurantId:       number | null;
  planName:           string;
  subscriptionStatus: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) throw new UnauthorizedException('Token inválido');
    return {
      id:                 payload.sub,
      email:              payload.email,
      role:               payload.role,
      restaurantId:       payload.restaurantId,
      planName:           payload.planName,
      subscriptionStatus: payload.subscriptionStatus,
    };
  }
}
