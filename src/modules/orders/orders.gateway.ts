/**
 * RUTA: src/modules/orders/orders.gateway.ts
 * NAMESPACE: /restaurant
 *
 * ═══════════════════════════════════════════════════════════════════
 * PLATAFORMA: App Android — SOLO Plan Premium
 * RECEPTORES: waiter, restaurant_admin, cashier
 *
 * Eventos emitidos:
 *   order:status      → cambio de estado general del pedido
 *   order:ready       → comanda lista (+ push FCM al waiter)
 *   order:delivered   → pedido entregado (dispara trigger FIFO)
 *   inventory:alert   → insumo con stock bajo o caducando
 *   dish:unavailable  → platillo auto-desactivado por stock 0
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

@WebSocketGateway({ namespace: '/restaurant', cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('OrdersGateway');

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

      client.data.user = payload;
      client.join(`restaurant_${payload.restaurantId}`);
      this.logger.log(
        `[/restaurant] Conectado: userId=${payload.sub} role=${payload.role}`,
      );
    } catch {
      this.logger.warn('[/restaurant] Conexión rechazada: token inválido');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[/restaurant] Desconectado: ${client.id}`);
  }

  // ─── Métodos de emisión (llamados desde services) ────────────────

  emitNewOrder(restaurantId: number, payload: object) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('order:new_notification', payload);
  }

  emitOrderStatusChanged(restaurantId: number, payload: object) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('order:status', payload);
  }

  emitOrderReady(restaurantId: number, payload: object) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('order:ready', payload);
  }

  emitOrderDelivered(restaurantId: number, payload: object) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('order:delivered', payload);
  }

  emitInventoryAlert(restaurantId: number, payload: object) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('inventory:alert', payload);
  }

  emitDishUnavailable(restaurantId: number, payload: object) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('dish:unavailable', payload);
  }
}
