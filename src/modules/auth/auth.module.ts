/**
 * RUTA: src/modules/auth/auth.module.ts
 */
import { Module }          from '@nestjs/common';
import { JwtModule }       from '@nestjs/jwt';
import { PassportModule }  from '@nestjs/passport';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { ConfigService }   from '@nestjs/config';

import { AuthController }   from './auth.controller';
import { AuthService }      from './auth.service';
import { JwtStrategy }      from './strategies/jwt.strategy';
import { RefreshToken }     from './entities/refresh-token.entity';
import { User }             from '../users/entities/user.entity';
import { SaasSubscription } from '../saas/entities/saas-subscription.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES', '15m') },
      }),
    }),
    TypeOrmModule.forFeature([User, RefreshToken, SaasSubscription]),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService, JwtModule],
})
export class AuthModule {}
