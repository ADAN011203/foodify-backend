// RUTA: src/database/migrations/001-CreateSaasPlansAndSubscriptions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSaasPlansAndSubscriptions1710000000001 implements MigrationInterface {
  name = 'CreateSaasPlansAndSubscriptions1710000000001';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE saas_plans (
        id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        name        VARCHAR(80)     NOT NULL,
        price_mxn   DECIMAL(10,2)   NOT NULL,
        max_branches TINYINT        NOT NULL DEFAULT 1,
        max_menus   TINYINT         NOT NULL DEFAULT 2,
        features    JSON            NOT NULL,
        is_active   TINYINT(1)      NOT NULL DEFAULT 1,
        created_at  DATETIME        NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await q.query(`
      CREATE TABLE saas_subscriptions (
        id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
        restaurant_id       INT UNSIGNED NOT NULL,
        plan_id             INT UNSIGNED NOT NULL,
        status              ENUM('trial','active','past_due','suspended','cancelled') NOT NULL DEFAULT 'trial',
        amount_mxn          DECIMAL(10,2) NOT NULL,
        billing_cycle_day   TINYINT NOT NULL DEFAULT 1,
        trial_ends_at       DATETIME NULL,
        next_billing_at     DATETIME NOT NULL,
        current_period_end  DATETIME NOT NULL,
        cancelled_at        DATETIME NULL,
        created_at          DATETIME NOT NULL DEFAULT NOW(),
        updated_at          DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
        PRIMARY KEY (id),
        INDEX IDX_sub_status_billing (status, next_billing_at),
        CONSTRAINT FK_sub_plan FOREIGN KEY (plan_id) REFERENCES saas_plans(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await q.query(`
      CREATE TABLE payment_transactions (
        id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
        subscription_id INT UNSIGNED NOT NULL,
        amount          DECIMAL(10,2) NOT NULL,
        currency        CHAR(3) NOT NULL DEFAULT 'MXN',
        status          ENUM('success','failed','refunded','dispute','pending') NOT NULL,
        payment_method  VARCHAR(50) NULL,
        gateway_ref     VARCHAR(100) NULL UNIQUE,
        paid_at         DATETIME NULL,
        created_at      DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        INDEX IDX_tx_subscription (subscription_id),
        CONSTRAINT FK_tx_sub FOREIGN KEY (subscription_id) REFERENCES saas_subscriptions(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS payment_transactions`);
    await q.query(`DROP TABLE IF EXISTS saas_subscriptions`);
    await q.query(`DROP TABLE IF EXISTS saas_plans`);
  }
}
