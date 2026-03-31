// RUTA: src/database/migrations/002-CreateUsersAndTokens.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndTokens1710000000002 implements MigrationInterface {
  name = 'CreateUsersAndTokens1710000000002';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE users (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
        restaurant_id INT UNSIGNED NULL,
        role          ENUM('saas_admin','restaurant_admin','waiter','chef','cashier') NOT NULL,
        full_name     VARCHAR(120) NOT NULL,
        email         VARCHAR(190) NOT NULL UNIQUE,
        phone         VARCHAR(20) NULL,
        password_hash VARCHAR(255) NOT NULL,
        fcm_token     VARCHAR(255) NULL COMMENT 'Token FCM para push Android — Solo Premium',
        is_active     TINYINT(1) NOT NULL DEFAULT 1,
        last_login_at DATETIME NULL,
        created_at    DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id)
        -- Nota: la FK hacia restaurants se agrega en otra migracion
        -- para evitar una dependencia circular entre users y restaurants.
        -- (MySQL requiere que la tabla referenciada exista al momento de crear la FK.)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await q.query(`
      CREATE TABLE refresh_tokens (
        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id     INT UNSIGNED NOT NULL,
        token_hash  VARCHAR(255) NOT NULL,
        expires_at  DATETIME NOT NULL,
        revoked     TINYINT(1) NOT NULL DEFAULT 0,
        created_at  DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        CONSTRAINT FK_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await q.query(`DROP TABLE IF EXISTS users`);
  }
}
