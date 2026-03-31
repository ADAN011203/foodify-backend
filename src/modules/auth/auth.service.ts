/**
 * RUTA: src/modules/auth/auth.service.ts
 *
 * v3.2 — CAMBIOS:
 *   - Sin referencias al rol 'manager'
 *   - PREMIUM_ONLY_ROLES: waiter, chef, cashier bloqueados en Plan Básico
 *   - JWT incluye planName y subscriptionStatus
 *   - updateFcmToken: para App Android (Solo Premium)
 */
import {
  ForbiddenException, Injectable,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { JwtService }       from '@nestjs/jwt';
import { ConfigService }    from '@nestjs/config';
import * as bcrypt          from 'bcrypt';

import { User }             from '../users/entities/user.entity';
import { RefreshToken }     from './entities/refresh-token.entity';
import { SaasSubscription } from '../saas/entities/saas-subscription.entity';
import {
  LoginDto, ForgotPasswordDto, VerifyOtpDto,
  ResetPasswordDto, UpdateFcmTokenDto, RefreshTokenDto,
} from './dto/auth.dto';
import { PREMIUM_ONLY_ROLES, Role } from '../../shared/decorators/roles.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private tokenRepo: Repository<RefreshToken>,
    @InjectRepository(SaasSubscription)
    private subRepo: Repository<SaasSubscription>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    // 1. Buscar usuario
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Validar contraseña
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    // EXPLICIT BYPASS: Fetch the restaurant_id using raw SQL to avoid TypeORM parsing bugs
    const rawData = await this.userRepo.query(`SELECT restaurant_id FROM users WHERE id = ?`, [user.id]);
    const actualRestaurantId = rawData[0]?.restaurant_id || null;

    // 3. Validar plan y suscripción (excepto saas_admin)
    let planName           = 'N/A';
    let subscriptionStatus = 'N/A';

    if ((user.role as unknown as Role) !== Role.SAAS_ADMIN) {
      const sub = await this.subRepo.findOne({
        where:     { restaurant: { id: actualRestaurantId || -1 } },
        relations: ['plan'],
      });

      if (!sub) throw new ForbiddenException('Sin suscripción activa');

      planName           = sub.plan?.name ?? 'Básico';
      subscriptionStatus = sub.status;

      // Bloquear accesos en estados cerrados
      if (['suspended', 'cancelled'].includes(sub.status)) {
        throw new ForbiddenException(`ACCOUNT_${sub.status.toUpperCase()}`);
      }

      // Bloquear roles Premium-only si el plan es Básico
      const isPremium = planName.toLowerCase().includes('premium');
      if (PREMIUM_ONLY_ROLES.includes(user.role as unknown as Role) && !isPremium) {
        throw new ForbiddenException(
          `El rol '${user.role}' solo está disponible en Plan Premium`,
        );
      }
    }

    // 4. Actualizar último login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // 5. Generar tokens
    console.log('[AUTH_DEBUG] User from DB:', user.email);
    console.log('[AUTH_DEBUG] User restaurant relation:', user.restaurant);
    console.log('[AUTH_DEBUG] User restaurantId column:', user.restaurantId);

    const payload = {
      sub:                user.id,
      email:              user.email,
      role:               user.role,
      restaurantId:       actualRestaurantId,
      planName,
      subscriptionStatus,
    };
    
    console.log('[AUTH_DEBUG] Final Payload:', payload);

    const accessToken = this.jwt.sign(payload, {
      secret:    this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
    });
    const refreshToken = this.jwt.sign(
      { sub: user.id },
      {
        secret:    this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES', '30d'),
      },
    );

    // 6. Guardar hash del refresh token
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.tokenRepo.save({
      user:      { id: user.id },
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      role:               user.role,
      planName,
      subscriptionStatus,
    };
  }

  async refresh(rawToken: string) {
    let payload: { sub: number };
    try {
      payload = this.jwt.verify(rawToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const stored = await this.tokenRepo.findOne({
      where:  { user: { id: payload.sub }, revoked: false },
      order:  { createdAt: 'DESC' },
    });
    if (!stored) throw new UnauthorizedException('Refresh token no encontrado');

    const valid = await bcrypt.compare(rawToken, stored.tokenHash);
    if (!valid) throw new UnauthorizedException('Refresh token inválido');

    // Revocar el actual
    await this.tokenRepo.update(stored.id, { revoked: true });

    const user = await this.userRepo.findOneBy({ id: payload.sub });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const newPayload = {
      sub:          user.id,
      email:        user.email,
      role:         user.role,
      restaurantId: user.restaurantId,
    };

    const accessToken = this.jwt.sign(newPayload, {
      secret:    this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
    });
    const newRefresh = this.jwt.sign(
      { sub: user.id },
      {
        secret:    this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES', '30d'),
      },
    );

    const hash = await bcrypt.hash(newRefresh, 10);
    await this.tokenRepo.save({
      user:      { id: user.id },
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken: newRefresh };
  }

  async logout(userId: number) {
    await this.tokenRepo.update(
      { user: { id: userId }, revoked: false },
      { revoked: true },
    );
    return { message: 'Sesión cerrada correctamente' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    // No revelar si el email existe o no (seguridad)
    if (!user) return { message: 'OTP enviado al correo si existe la cuenta' };

    // TODO: generar OTP de 6 dígitos, guardar con TTL 15min en Redis,
    //       enviar email via Nodemailer/SendGrid
    return { message: 'OTP enviado al correo' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // TODO: validar OTP desde Redis, retornar reset_token (JWT 5min)
    return { resetToken: 'placeholder_reset_token' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // TODO: validar reset_token, hashear nueva contraseña, actualizar usuario
    const hash = await bcrypt.hash(dto.newPassword, 12);
    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Actualiza el token FCM del dispositivo Android del usuario.
   * Solo llamado desde App Android (Plan Premium).
   */
  async updateFcmToken(userId: number, dto: UpdateFcmTokenDto) {
    await this.userRepo.update(userId, { fcmToken: dto.fcmToken });
    return { message: 'FCM token actualizado' };
  }
}
