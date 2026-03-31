/**
 * RUTA: src/shared/decorators/require-feature.decorator.ts
 *
 * Define las features de cada plan y el decorador @RequireFeature()
 * para bloquear endpoints en Plan Básico.
 */
import { SetMetadata } from '@nestjs/common';

export enum PlanFeature {
  MOBILE_APP         = 'mobileApp',
  KITCHEN_MODULE     = 'kitchenModule',
  INVENTORY_FIFO     = 'inventoryFifo',
  PUSH_NOTIFICATIONS = 'pushNotifications',
  WEBSOCKETS         = 'websockets',
  STAFF_REPORTS      = 'staffReports',
  WAITER_CHEF_ROLES  = 'waiterChefRoles',
  QR_SCAN_DELIVERY   = 'qrScanDelivery',   // escaneo QR para llevar — Solo Premium
}

/** Features disponibles SOLO en Plan Premium */
export const PREMIUM_PLAN_FEATURES: PlanFeature[] = [
  PlanFeature.MOBILE_APP,
  PlanFeature.KITCHEN_MODULE,
  PlanFeature.INVENTORY_FIFO,
  PlanFeature.PUSH_NOTIFICATIONS,
  PlanFeature.WEBSOCKETS,
  PlanFeature.STAFF_REPORTS,
  PlanFeature.WAITER_CHEF_ROLES,
  PlanFeature.QR_SCAN_DELIVERY,
];

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * @RequireFeature(PlanFeature.X)
 * PlanGuard lanza 403 si el restaurante no tiene esta feature en su plan.
 *
 * Uso:
 *   @RequireFeature(PlanFeature.QR_SCAN_DELIVERY)
 *   @Patch(':id/scan-qr')
 *   scanQr() { ... }
 */
export const RequireFeature = (feature: PlanFeature) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
