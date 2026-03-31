// RUTA: src/database/migrations/008-CreateKitchenSessions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKitchenSessions1710000000008 implements MigrationInterface {
  name = 'CreateKitchenSessions1710000000008';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE kitchen_sessions (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
        chef_id       INT UNSIGNED NOT NULL,
        restaurant_id INT UNSIGNED NOT NULL,
        started_at    DATETIME NOT NULL DEFAULT NOW(),
        ended_at      DATETIME NULL COMMENT 'NULL = turno activo',
        PRIMARY KEY (id),
        CONSTRAINT FK_ks_chef FOREIGN KEY (chef_id)       REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT FK_ks_rest FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS kitchen_sessions`);
  }
}
