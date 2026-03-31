// RUTA: src/modules/notifications/notifications.service.ts
// Push notifications via Firebase FCM Admin SDK.
// Solo Plan Premium — App Android (waiter, chef, cashier, restaurant_admin).
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  /**
   * Enviar push notification a un dispositivo Android.
   * @param fcmToken  Token del dispositivo (guardado en users.fcm_token)
   * @param title     Título de la notificación
   * @param body      Cuerpo del mensaje
   * @param data      Payload adicional (ej: orderId, tableNumber)
   */
  async sendPush(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!fcmToken) {
      this.logger.warn('sendPush: fcmToken vacío, notificación omitida');
      return;
    }
    try {
      // TODO: inicializar Firebase Admin SDK con FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY
      // const message = { token: fcmToken, notification: { title, body }, data };
      // await admin.messaging().send(message);
      this.logger.log(`[FCM] Push enviado a token ...${fcmToken.slice(-6)}: ${title}`);
    } catch (err) {
      this.logger.error(`[FCM] Error enviando push: ${err.message}`);
    }
  }

  /**
   * Notifica al mesero cuando su pedido está listo.
   * Disparado por: trigger MySQL after_order_item_status_update
   *   → KitchenService.checkAllItemsReady()
   */
  async notifyOrderReady(fcmToken: string, orderId: number, tableNumber: number | null) {
    await this.sendPush(
      fcmToken,
      '🍽 Pedido listo para entregar',
      `La orden #${String(orderId).padStart(4,'0')}${tableNumber ? ` (Mesa ${tableNumber})` : ''} está lista.`,
      { orderId: String(orderId), tableNumber: String(tableNumber ?? '') },
    );
  }

  /**
   * Notifica al admin cuando hay alerta de stock bajo.
   * Disparado por: InventoryService.createAdjustment() o trigger FIFO.
   */
  async notifyLowStock(fcmToken: string, itemName: string, currentStock: number, unit: string) {
    await this.sendPush(
      fcmToken,
      '⚠️ Stock bajo en inventario',
      `"${itemName}" tiene solo ${currentStock} ${unit} disponibles.`,
      { alertType: 'low_stock', itemName, currentStock: String(currentStock) },
    );
  }

  /**
   * Notifica al admin cuando un insumo está próximo a caducar.
   * Jorge: "Alertas de Caducidad — flag alerta:true"
   */
  async notifyExpiringSoon(fcmToken: string, itemName: string, expiryDate: Date) {
    const days = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    await this.sendPush(
      fcmToken,
      '📅 Insumo próximo a caducar',
      `"${itemName}" caduca en ${days} día${days !== 1 ? 's' : ''}.`,
      { alertType: 'expiring_soon', itemName, daysLeft: String(days) },
    );
  }
}
