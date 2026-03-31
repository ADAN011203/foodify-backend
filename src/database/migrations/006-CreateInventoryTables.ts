// RUTA: src/database/migrations/006-CreateInventoryTables.ts
// Entidades de Jorge: Insumo (inventory_items) + Lote (inventory_lots)
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTables1710000000006 implements MigrationInterface {
  name = 'CreateInventoryTables1710000000006';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE inventory_items (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
        restaurant_id INT UNSIGNED NOT NULL,
        name          VARCHAR(120) NOT NULL COMMENT 'Jorge: nombreInsumo',
        unit          VARCHAR(20) NOT NULL  COMMENT 'Jorge: unidadMedida — Kg, L, Pz',
        min_stock     DECIMAL(10,3) NOT NULL DEFAULT 0,
        current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
        category      VARCHAR(60) NULL,
        image_url     VARCHAR(255) NULL,
        created_at    DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        CONSTRAINT FK_inv_item_rest FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await q.query(`
      CREATE TABLE inventory_lots (
        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
        item_id     INT UNSIGNED NOT NULL,
        lot_number  VARCHAR(50) NULL,
        quantity    DECIMAL(10,3) NOT NULL,
        remaining   DECIMAL(10,3) NOT NULL,
        unit_cost   DECIMAL(10,4) NOT NULL,
        supplier    VARCHAR(120) NULL COMMENT 'Jorge: proveedor',
        entry_date  DATE NOT NULL COMMENT 'Clave FIFO — lote mas antiguo primero',
        expiry_date DATE NULL     COMMENT 'Jorge: fechaCaducidad',
        status      ENUM('available','low','critical','expired','depleted') NOT NULL DEFAULT 'available'
                    COMMENT 'Jorge: estado — available=Disponible, low=Proximo a caducar, expired=Caducado',
        created_at  DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        INDEX IDX_lot_item_entry (item_id, entry_date),
        INDEX IDX_lot_expiry     (expiry_date, status),
        CONSTRAINT FK_lot_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await q.query(`
      CREATE TABLE inventory_movements (
        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
        lot_id      INT UNSIGNED NOT NULL,
        order_id    INT UNSIGNED NULL,
        type        ENUM('sale','waste','adjustment','entry') NOT NULL,
        quantity    DECIMAL(10,3) NOT NULL,
        notes       VARCHAR(255) NULL,
        created_by_id INT UNSIGNED NULL,
        created_at  DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        INDEX IDX_mov_lot_date (lot_id, created_at),
        CONSTRAINT FK_mov_lot FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await q.query(`
      CREATE TABLE inventory_alerts (
        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
        item_id     INT UNSIGNED NOT NULL,
        type        ENUM('low_stock','expiring_soon','expired','out_of_stock') NOT NULL,
        message     VARCHAR(255) NOT NULL,
        is_resolved TINYINT(1) NOT NULL DEFAULT 0,
        created_at  DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        CONSTRAINT FK_alert_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS inventory_alerts`);
    await q.query(`DROP TABLE IF EXISTS inventory_movements`);
    await q.query(`DROP TABLE IF EXISTS inventory_lots`);
    await q.query(`DROP TABLE IF EXISTS inventory_items`);
  }
}
