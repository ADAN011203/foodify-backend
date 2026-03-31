// RUTA: src/database/migrations/005-CreateDishesAndRecipes.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDishesAndRecipes1710000000005 implements MigrationInterface {
  name = 'CreateDishesAndRecipes1710000000005';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE dishes (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
        restaurant_id INT UNSIGNED NOT NULL,
        category_id   INT UNSIGNED NULL,
        name          VARCHAR(120) NOT NULL,
        description   TEXT NULL,
        price         DECIMAL(10,2) NOT NULL,
        cost_est      DECIMAL(10,2) NOT NULL DEFAULT 0,
        margin_pct    DECIMAL(5,2) AS (((price - cost_est) / price) * 100) STORED,
        prep_time_min TINYINT NOT NULL DEFAULT 15,
        is_available  TINYINT(1) NOT NULL DEFAULT 1,
        images        JSON NULL COMMENT 'Array de URLs S3 (max 3) — imagenUri de Jorge = images[0]',
        allergens     JSON NULL,
        sort_order    SMALLINT NOT NULL DEFAULT 0,
        deleted_at    DATETIME NULL COMMENT 'Soft delete',
        created_at    DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        INDEX IDX_dish_rest_avail (restaurant_id, is_available),
        CONSTRAINT FK_dish_rest FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT,
        CONSTRAINT FK_dish_cat  FOREIGN KEY (category_id)   REFERENCES menu_categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await q.query(`
      CREATE TABLE recipes (
        id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
        dish_id      INT UNSIGNED NOT NULL UNIQUE,
        prep_time_min TINYINT NOT NULL DEFAULT 15,
        servings     TINYINT NOT NULL DEFAULT 1,
        steps        JSON NULL,
        notes        TEXT NULL,
        created_at   DATETIME NOT NULL DEFAULT NOW(),
        updated_at   DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
        PRIMARY KEY (id),
        CONSTRAINT FK_recipe_dish FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await q.query(`
      CREATE TABLE recipe_ingredients (
        id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
        recipe_id INT UNSIGNED NOT NULL,
        item_id   INT UNSIGNED NULL COMMENT 'FK a inventory_items — vincula con FIFO',
        name      VARCHAR(100) NOT NULL,
        quantity  DECIMAL(10,4) NOT NULL,
        unit      VARCHAR(20) NOT NULL,
        is_optional TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        CONSTRAINT FK_ing_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS recipe_ingredients`);
    await q.query(`DROP TABLE IF EXISTS recipes`);
    await q.query(`DROP TABLE IF EXISTS dishes`);
  }
}
