/**
 * RUTA: src/shared/decorators/roles.decorator.ts
 *
 * v3.2 — CAMBIOS:
 *   - Eliminado rol 'manager' del ENUM Role
 *   - cashier = Solo Plan Premium (App Android)
 *   - Añadido @Public() decorator para endpoints sin JWT (takeout PWA pública)
 */
import { SetMetadata } from '@nestjs/common';

export enum Role {
  SAAS_ADMIN       = 'saas_admin',
  RESTAURANT_ADMIN = 'restaurant_admin',
  // 'manager' ELIMINADO en v3.2 — funciones absorbidas por restaurant_admin
  WAITER           = 'waiter',   // Solo Premium — App Android
  CHEF             = 'chef',     // Solo Premium — App Android
  CASHIER          = 'cashier',  // Solo Premium — App Android
}

/** Roles que SOLO pueden operar con Plan Premium (App Android) */
export const PREMIUM_ONLY_ROLES: Role[] = [
  Role.WAITER,
  Role.CHEF,
  Role.CASHIER,
];

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ALLOW_READ_ONLY_KEY = 'allowReadOnly';
/** Permite GET en estado past_due */
export const AllowReadOnly = () => SetMetadata(ALLOW_READ_ONLY_KEY, true);

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * @Public() — Omite JWT. Usado en:
 *   - POST /orders (takeout desde PWA pública sin cuenta)
 *   - GET /menu/:slug  (menú digital para comensales)
 *   - POST /auth/login, forgot-password, verify-otp, reset-password
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
