// RUTA: src/modules/payments/payments.controller.ts
// BASE: /api/v1/payments
// Solo recibe webhooks de Stripe/Conekta — acceso exclusivo saas_admin y sistema
import { Body, Controller, Headers, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Public } from '../../shared/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  /**
   * POST /api/v1/payments/stripe/webhook
   * Recibe webhooks de Stripe. Valida firma con STRIPE_WEBHOOK_SECRET.
   * Actualiza saas_subscriptions según el evento.
   */
  @Public()
  @Post('stripe/webhook')
  stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    // TODO: validar firma con Stripe SDK y actualizar suscripción
    return { received: true };
  }

  /**
   * POST /api/v1/payments/conekta/webhook
   * Recibe webhooks de Conekta. Valida firma con CONEKTA_API_KEY.
   */
  @Public()
  @Post('conekta/webhook')
  conektaWebhook(@Body() body: object) {
    // TODO: procesar evento Conekta y actualizar suscripción
    return { received: true };
  }
}
