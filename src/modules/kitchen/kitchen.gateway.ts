/**
 * RUTA: src/modules/kitchen/kitchen.gateway.ts
 * NAMESPACE: /kitchen
 *
 * ═══════════════════════════════════════════════════════════════════
 * PLATAFORMA: App Android — SOLO Plan Premium
 * RECEPTORES: chef
 *
 * Eventos Server → Chef:
 *   order:new        → nueva comanda (dine_in o takeout) recibida
 *   order:cancelled  → comanda cancelada, retirar del board
 *   order:ready      → toda la comanda lista (todos los ítems = ready)
 *
 * Eventos Chef → Server:
 *   order:item:start → chef inicia preparación de un ítem
 *   order:item:ready → chef marca ítem individual como listo
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  ConnectedSocket, MessageBody,
  OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService }     from '@nestjs/jwt';
import { ConfigService }  from '@nestjs/config';
import { Logger }         from '@nestjs/common';

@WebSocketGateway({ namespace: '/kitchen', cors: { origin: '*' } })
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('KitchenGateway');

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token
        ?? client.handshake.headers?.authorization?.split(' ')[1];

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });

      // Solo chef y restaurant_admin pueden conectarse al namespace /kitchen
      if (!['chef', 'restaurant_admin'].includes(payload.role)) {
        this.logger.warn(
          `[/kitchen] Rol no autorizado: ${payload.role}`,
        );
        client.disconnect();
        return;
      }

      client.data.user = payload;
      client.join(`kitchen_${payload.restaurantId}`);
      this.logger.log(
        `[/kitchen] Conectado: userId=${payload.sub} role=${payload.role}`,
      );
    } catch {
      this.logger.warn('[/kitchen] Conexión rechazada: token inválido');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[/kitchen] Desconectado: ${client.id}`);
  }

  // ─── Eventos Chef → Server ────────────────────────────────────────

  /**
   * order:item:start
   * El chef inicia la preparación de un ítem específico.
   * El service actualiza started_at = NOW() en order_items.
   */
  @SubscribeMessage('order:item:start')
  handleItemStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderItemId: number },
  ) {
    this.logger.log(
      `[/kitchen] item:start orderItemId=${data.orderItemId} by userId=${client.data.user?.sub}`,
    );
    // El service de kitchen maneja la lógica de BD
    return { event: 'order:item:start', data };
  }

  /**
   * order:item:ready
   * El chef marca un ítem individual como listo.
   * Si TODOS los ítems del pedido = ready:
   *   → trigger MySQL cambia kitchen_status = ready
   *   → emite order:ready al namespace /restaurant (notifica al waiter + FCM)
   */
  @SubscribeMessage('order:item:ready')
  handleItemReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderItemId: number },
  ) {
    this.logger.log(
      `[/kitchen] item:ready orderItemId=${data.orderItemId} by userId=${client.data.user?.sub}`,
    );
    return { event: 'order:item:ready', data };
  }

  // ─── Métodos de emisión (llamados desde KitchenService) ───────────

  emitNewOrder(restaurantId: number, payload: object) {
    this.server
      .to(`kitchen_${restaurantId}`)
      .emit('order:new', payload);
  }

  emitOrderCancelled(restaurantId: number, payload: object) {
    this.server
      .to(`kitchen_${restaurantId}`)
      .emit('order:cancelled', payload);
  }

  /**
   * Notifica que una orden ha sido finalizada (entregada o cancelada)
   * para que el board de cocina la retire inmediatamente.
   */
  emitOrderFinalized(restaurantId: number, orderId: number) {
    this.server
      .to(`kitchen_${restaurantId}`)
      .emit('order:finalized', { orderId });
  }

  emitOrderReady(restaurantId: number, payload: object) {
    // Emite a /kitchen (chef) Y a /restaurant (waiter)
    this.server
      .to(`kitchen_${restaurantId}`)
      .emit('order:ready', payload);
  }
}
