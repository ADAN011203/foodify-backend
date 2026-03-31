// RUTA: src/database/migrations/004-CreateMenusAndCategories.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMenusAndCategories1710000000004 implements MigrationInterface {
  name = 'CreateMenusAndCategories1710000000004';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE menus (
        id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
        restaurant_id         INT UNSIGNED NOT NULL,
        name                  VARCHAR(100) NOT NULL,
        description           TEXT NULL,
        is_active             TINYINT(1) NOT NULL DEFAULT 1,
        schedule              JSON NULL COMMENT '{"days":[1,2,3,4,5],"start":"12:00","end":"16:00"}',
        sort_order            SMALLINT NOT NULL DEFAULT 0,
        allow_outside_schedule TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'v3.1: true=flexible, false=solo en horario',
        created_at            DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        INDEX IDX_menu_restaurant_active (restaurant_id, is_active),
        CONSTRAINT FK_menu_rest FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await q.query(`
      CREATE TABLE menu_categories (
        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
        menu_id     INT UNSIGNED NOT NULL,
        name        VARCHAR(100) NOT NULL,
        description TEXT NULL,
        icon        VARCHAR(50) NULL,
        schedule    JSON NULL,
        sort_order  SMALLINT NOT NULL DEFAULT 0,
        is_active   TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        CONSTRAINT FK_cat_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS menu_categories`);
    await q.query(`DROP TABLE IF EXISTS menus`);
  }
}
