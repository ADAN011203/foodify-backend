// RUTA: src/database/migrations/007-CreateOrdersAndItems.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersAndItems1710000000007 implements MigrationInterface {
  name = 'CreateOrdersAndItems1710000000007';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE orders (
        id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
        restaurant_id  INT UNSIGNED NOT NULL,
        table_id       INT UNSIGNED NULL,
        waiter_id      INT UNSIGNED NULL,
        order_number   CHAR(4) NOT NULL,
        type           ENUM('dine_in','takeout','delivery') NOT NULL DEFAULT 'dine_in',
        status         ENUM('pending','confirmed','preparing','ready','delivered','cancelled') NOT NULL DEFAULT 'pending',
        kitchen_status ENUM('pending','preparing','ready','delivered') NOT NULL DEFAULT 'pending',
        qr_code        VARCHAR(500) NULL   COMMENT 'v3.2: QR unico para ordenes Para Llevar — escaneado por waiter/cashier en App Android Premium',
        customer_name  VARCHAR(120) NULL   COMMENT 'v3.2: nombre del comensal para Para Llevar desde PWA publica',
        customer_phone VARCHAR(20) NULL    COMMENT 'v3.2: telefono del comensal para Para Llevar',
        subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
        tip_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
        total          DECIMAL(10,2) NOT NULL DEFAULT 0,
        notes          TEXT NULL,
        delivered_at   DATETIME NULL COMMENT 'Dispara trigger FIFO al actualizarse',
        cancelled_at   DATETIME NULL,
        cancel_reason  VARCHAR(255) NULL,
        created_at     DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        INDEX IDX_order_rest_status  (restaurant_id, status),
        INDEX IDX_order_kitchen      (kitchen_status, restaurant_id),
        INDEX IDX_order_created      (created_at),
        INDEX IDX_order_qr           (qr_code(50)),
        CONSTRAINT FK_order_rest    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT,
        CONSTRAINT FK_order_table   FOREIGN KEY (table_id)      REFERENCES \`tables\`(id) ON DELETE RESTRICT,
        CONSTRAINT FK_order_waiter  FOREIGN KEY (waiter_id)     REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await q.query(`
      CREATE TABLE order_items (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_id      INT UNSIGNED NOT NULL,
        dish_id       INT UNSIGNED NOT NULL,
        quantity      TINYINT UNSIGNED NOT NULL DEFAULT 1,
        unit_price    DECIMAL(10,2) NOT NULL,
        subtotal      DECIMAL(10,2) AS (quantity * unit_price) STORED,
        special_notes TEXT NULL    COMMENT 'Nota especial del mesero al chef',
        status        ENUM('pending','preparing','ready','served') NOT NULL DEFAULT 'pending',
        started_at    DATETIME NULL COMMENT 'Cuando el chef inicia este item',
        ready_at      DATETIME NULL COMMENT 'Cuando el item esta listo',
        created_at    DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        INDEX IDX_item_order  (order_id),
        INDEX IDX_item_status (status),
        CONSTRAINT FK_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT FK_item_dish  FOREIGN KEY (dish_id)  REFERENCES dishes(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS order_items`);
    await q.query(`DROP TABLE IF EXISTS orders`);
  }
}
