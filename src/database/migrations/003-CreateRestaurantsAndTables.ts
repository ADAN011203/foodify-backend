// RUTA: src/database/migrations/003-CreateRestaurantsAndTables.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRestaurantsAndTables1710000000003 implements MigrationInterface {
  name = 'CreateRestaurantsAndTables1710000000003';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE restaurants (
        id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
        owner_id         INT UNSIGNED NOT NULL,
        name             VARCHAR(120) NOT NULL,
        slug             VARCHAR(120) NOT NULL UNIQUE,
        logo_url         VARCHAR(255) NULL,
        address          VARCHAR(255) NULL,
        timezone         VARCHAR(50) NOT NULL DEFAULT 'America/Monterrey',
        currency         CHAR(3) NOT NULL DEFAULT 'MXN',
        is_active        TINYINT(1) NOT NULL DEFAULT 1,
        dashboard_config JSON NULL COMMENT 'Toggles de las 5 graficas del dashboard PWA',
        created_at       DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        CONSTRAINT FK_rest_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await q.query(`
      CREATE TABLE \`tables\` (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
        restaurant_id INT UNSIGNED NOT NULL,
        number        SMALLINT NOT NULL,
        capacity      TINYINT NOT NULL DEFAULT 4,
        qr_code_url   VARCHAR(255) NULL,
        status        ENUM('available','occupied','reserved','cleaning') NOT NULL DEFAULT 'available',
        PRIMARY KEY (id),
        CONSTRAINT FK_table_rest FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    /* Agregamos la FK desde `users` a `restaurants` despues de crear ambas tablas
       para evitar una dependencia circular entre migraciones. */
    await q.query(`
      ALTER TABLE users
      ADD CONSTRAINT FK_user_restaurant
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT
    `);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE users DROP FOREIGN KEY FK_user_restaurant`);
    await q.query(`DROP TABLE IF EXISTS \`tables\``);
    await q.query(`DROP TABLE IF EXISTS restaurants`);
  }
}
