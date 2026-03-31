/**
 * RUTA: src/database/migrations/011-UpdateOrdersAndRoles.ts
 *
 * Migración v3.2 — Cambios:
 *
 * 1. ALTER TABLE users:
 *    - Elimina 'manager' del ENUM role
 *    - ENUM queda: saas_admin, restaurant_admin, waiter, chef, cashier
 *
 * 2. ALTER TABLE orders:
 *    - ADD COLUMN qr_code      VARCHAR(500) NULL
 *      QR único para órdenes Para Llevar (takeout). NULL para dine_in.
 *      Plan Básico:  admin confirma entrega manual desde PWA.
 *      Plan Premium: waiter/cashier escanea QR desde App Android.
 *
 *    - ADD COLUMN customer_name  VARCHAR(120) NULL
 *      Nombre del comensal para órdenes Para Llevar desde PWA pública.
 *
 *    - ADD COLUMN customer_phone VARCHAR(20) NULL
 *      Teléfono del comensal para órdenes Para Llevar.
 *
 * IMPORTANTE: Antes de ejecutar esta migración, asegúrate de que
 *   NO existan usuarios con role='manager' en la BD.
 *   Si los hay, actualizar primero a 'restaurant_admin':
 *   UPDATE users SET role='restaurant_admin' WHERE role='manager';
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrdersAndRoles1711000000011 implements MigrationInterface {
  name = 'UpdateOrdersAndRoles1711000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── PASO 0: Actualizar usuarios con rol 'manager' antes de cambiar el ENUM
    await queryRunner.query(`
      UPDATE users
      SET role = 'restaurant_admin'
      WHERE role = 'manager'
    `);

    // ── PASO 1: Modificar ENUM role en tabla users (eliminar 'manager')
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY COLUMN \`role\`
        ENUM(
          'saas_admin',
          'restaurant_admin',
          'waiter',
          'chef',
          'cashier'
        ) NOT NULL
    `);

    // ── PASO 2: Añadir campo qr_code a orders
    const qrCodeCols = await queryRunner.query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME = 'qr_code'
    `);
    const qrCodeExists = Number(qrCodeCols?.[0]?.cnt ?? 0) > 0;
    if (!qrCodeExists) {
      await queryRunner.query(`
        ALTER TABLE \`orders\`
        ADD COLUMN \`qr_code\` VARCHAR(500) NULL DEFAULT NULL
          COMMENT 'QR único para órdenes Para Llevar (takeout). NULL para dine_in. Plan Premium: waiter/cashier lo escanea desde App Android. Plan Básico: admin confirma entrega manual desde PWA.'
          AFTER \`kitchen_status\`
      `);
    }

    // ── PASO 3: Añadir campo customer_name a orders
    const customerNameCols = await queryRunner.query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME = 'customer_name'
    `);
    const customerNameExists = Number(customerNameCols?.[0]?.cnt ?? 0) > 0;
    if (!customerNameExists) {
      await queryRunner.query(`
        ALTER TABLE \`orders\`
        ADD COLUMN \`customer_name\` VARCHAR(120) NULL DEFAULT NULL
          COMMENT 'Nombre del comensal para órdenes Para Llevar desde PWA pública (sin JWT). NULL para órdenes dine_in creadas por waiter.'
          AFTER \`qr_code\`
      `);
    }

    // ── PASO 4: Añadir campo customer_phone a orders
    const customerPhoneCols = await queryRunner.query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME = 'customer_phone'
    `);
    const customerPhoneExists = Number(customerPhoneCols?.[0]?.cnt ?? 0) > 0;
    if (!customerPhoneExists) {
      await queryRunner.query(`
        ALTER TABLE \`orders\`
        ADD COLUMN \`customer_phone\` VARCHAR(20) NULL DEFAULT NULL
          COMMENT 'Teléfono del comensal para órdenes Para Llevar. Permite contactar al cliente si hay algún problema.'
          AFTER \`customer_name\`
      `);
    }

    // ── PASO 5: Índice en qr_code para lookup rápido en scan-qr
    const qrIndex = await queryRunner.query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND INDEX_NAME = 'IDX_orders_qr_code'
    `);
    const qrIndexExists = Number(qrIndex?.[0]?.cnt ?? 0) > 0;
    if (!qrIndexExists) {
      await queryRunner.query(`
        CREATE INDEX \`IDX_orders_qr_code\`
        ON \`orders\` (\`qr_code\`(50))
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índice si existe
    const qrIndex = await queryRunner.query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND INDEX_NAME = 'IDX_orders_qr_code'
    `);
    const qrIndexExists = Number(qrIndex?.[0]?.cnt ?? 0) > 0;
    if (qrIndexExists) {
      await queryRunner.query(`
        DROP INDEX \`IDX_orders_qr_code\` ON \`orders\`
      `);
    }

    // Eliminar columnas si existen
    for (const columnName of ['customer_phone', 'customer_name', 'qr_code']) {
      const cols = await queryRunner.query(`
        SELECT COUNT(*) AS cnt
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
          AND COLUMN_NAME = '${columnName}'
      `);
      const exists = Number(cols?.[0]?.cnt ?? 0) > 0;
      if (exists) {
        await queryRunner.query(`
          ALTER TABLE \`orders\`
          DROP COLUMN \`${columnName}\`
        `);
      }
    }

    // Restaurar ENUM con 'manager' (rollback)
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY COLUMN \`role\`
        ENUM(
          'saas_admin',
          'restaurant_admin',
          'manager',
          'waiter',
          'chef',
          'cashier'
        ) NOT NULL
    `);
  }
}
