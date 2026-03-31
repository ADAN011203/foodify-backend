/**
 * RUTA: src/modules/auth/auth.controller.ts
 * BASE: /api/v1/auth
 *
 * ═══════════════════════════════════════════════════════════════════
 * ENDPOINTS COMPARTIDOS (PWA + App Android):
 * ───────────────────────────────────────────────────────────────────
 *   POST  /login            → Todos los roles. Valida plan antes de emitir JWT.
 *                             JWT incluye: role, planName, subscriptionStatus.
 *                             Bloquea waiter/chef/cashier si plan es Básico.
 *   POST  /refresh          → Rota refresh token → nuevo access_token
 *   POST  /logout           → Invalida refresh token en BD
 *   POST  /forgot-password  → Envía OTP de 6 dígitos al email (TTL 15min)
 *   POST  /verify-otp       → Valida OTP → retorna reset_token
 *   POST  /reset-password   → Actualiza contraseña con reset_token
 *   GET   /me               → Perfil completo del usuario autenticado
 *
 * ENDPOINTS SOLO APP ANDROID (Plan Premium):
 * ───────────────────────────────────────────────────────────────────
 *   PATCH /fcm-token        → waiter, chef, cashier actualizan token FCM
 *                             para push notifications Android.
 *                             restaurant_admin también lo usa en Premium.
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  Body, Controller, Get, Patch, Post, UseGuards,
} from '@nestjs/common';
import { AuthService }   from './auth.service';
import { JwtAuthGuard }  from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }    from '../../shared/guards/roles.guard';
import { Public, Roles, Role } from '../../shared/decorators/roles.decorator';
import { CurrentUser }   from '../../shared/decorators/current-user.decorator';
import { RequireFeature, PlanFeature } from '../../shared/decorators/require-feature.decorator';
import {
  LoginDto, RefreshTokenDto, ForgotPasswordDto,
  VerifyOtpDto, ResetPasswordDto, UpdateFcmTokenDto,
} from './dto/auth.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ════════════════════════════════════════════════════════════════
  // COMPARTIDOS — PWA + App Android
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/auth/login
   * Público — todos los roles.
   *
   * Proceso:
   *   1. Valida email + password (bcrypt)
   *   2. Verifica estado de suscripción del restaurante
   *   3. Bloquea waiter/chef/cashier si plan NO es Premium
   *   4. Retorna accessToken (15min) + refreshToken (30d) + planName + role
   *
   * El JWT contiene: { sub, email, role, restaurantId, planName, subscriptionStatus }
   * El frontend no necesita peticiones extra para saber el plan activo.
   */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/v1/auth/refresh
   * Rota el refresh token y emite nuevo access_token.
   */
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * POST /api/v1/auth/logout
   * Invalida el refresh token actual en BD.
   */
  @Post('logout')
  logout(@CurrentUser() user: { id: number }) {
    return this.authService.logout(user.id);
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Envía OTP de 6 dígitos al email (TTL 15min).
   */
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * POST /api/v1/auth/verify-otp
   * Valida OTP → retorna reset_token temporal.
   */
  @Public()
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  /**
   * POST /api/v1/auth/reset-password
   * Actualiza contraseña usando reset_token válido.
   */
  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * GET /api/v1/auth/me
   * Retorna el perfil completo del usuario autenticado.
   * Disponible en PWA y App Android.
   */
  @Get('me')
  me(@CurrentUser() user: unknown) {
    return { data: user };
  }

  // ════════════════════════════════════════════════════════════════
  // SOLO APP ANDROID — Plan Premium
  // ════════════════════════════════════════════════════════════════

  /**
   * PATCH /api/v1/auth/fcm-token
   * App Android: actualiza el token FCM del dispositivo Android.
   *
   * Usado por: waiter, chef, cashier, restaurant_admin (en Premium).
   * El token se usa para enviar push notifications cuando:
   *   - order:ready → notifica al waiter
   *   - inventory:alert → notifica al admin
   *
   * Solo disponible en Plan Premium (App Android).
   * En Plan Básico no existe App Android, por lo tanto este endpoint
   * nunca es llamado desde Plan Básico.
   */
  @RequireFeature(PlanFeature.PUSH_NOTIFICATIONS)
  @Roles(
    Role.WAITER,
    Role.CHEF,
    Role.CASHIER,
    Role.RESTAURANT_ADMIN,
  )
  @Patch('fcm-token')
  updateFcmToken(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.authService.updateFcmToken(user.id, dto);
  }
}
