// RUTA: src/database/seeds/initial.seed.ts
// Seeds iniciales: planes SaaS + usuario saas_admin CODEX + restaurante demo
import { DataSource } from 'typeorm';
import * as bcrypt    from 'bcrypt';

export async function runSeeds(ds: DataSource) {
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ── Planes SaaS ───────────────────────────────────────────────
    const existing = await queryRunner.query(`SELECT COUNT(*) as c FROM saas_plans`);
    if (Number(existing[0].c) === 0) {
      await queryRunner.query(`
        INSERT INTO saas_plans (name, price_mxn, max_branches, max_menus, features, is_active) VALUES
        ('Básico',    1500.00, 1, 2,
         '["pwa_admin","menu_digital","gestión_platillos","dashboard_graficas","mesas_qr","reportes_basicos"]',
         1),
        ('Premium',   2500.00, 3, 10,
         '["pwa_admin","menu_digital","gestión_platillos","dashboard_graficas","mesas_qr","reportes_basicos","mobileApp","kitchenModule","inventoryFifo","pushNotifications","websockets","staffReports","waiterChefRoles","qrScanDelivery"]',
         1)
      `);
      console.log('[Seed] Planes SaaS creados: Básico ($1,500) y Premium ($2,500)');
    }

    // ── Usuario saas_admin CODEX ──────────────────────────────────
    const adminExists = await queryRunner.query(
      `SELECT COUNT(*) as c FROM users WHERE email = 'admin@codex.foodify.mx'`
    );
    if (Number(adminExists[0].c) === 0) {
      const hash = await bcrypt.hash('Codex2026!', 12);
      await queryRunner.query(`
        INSERT INTO users (restaurant_id, role, full_name, email, password_hash, is_active)
        VALUES (NULL, 'saas_admin', 'Admin CODEX', 'admin@codex.foodify.mx', '${hash}', 1)
      `);
      console.log('[Seed] Usuario saas_admin creado: admin@codex.foodify.mx / Codex2026!');
    }

    // ── Restaurante demo ──────────────────────────────────────────
    const restExists = await queryRunner.query(
      `SELECT COUNT(*) as c FROM restaurants WHERE slug = 'demo-restaurant'`
    );
    if (Number(restExists[0].c) === 0) {
      const adminUser = await queryRunner.query(
        `SELECT id FROM users WHERE email = 'admin@codex.foodify.mx'`
      );
      const adminId = adminUser[0]?.id;

      if (adminId) {
        // Crear admin del restaurante demo
        const demoHash = await bcrypt.hash('Demo2026!', 12);
        await queryRunner.query(`
          INSERT INTO users (restaurant_id, role, full_name, email, password_hash, is_active)
          VALUES (NULL, 'restaurant_admin', 'Admin Demo', 'admin@demo.foodify.mx', '${demoHash}', 1)
        `);
        const demoAdmin = await queryRunner.query(
          `SELECT id FROM users WHERE email = 'admin@demo.foodify.mx'`
        );
        const demoAdminId = demoAdmin[0]?.id;

        // Crear restaurante demo
        await queryRunner.query(`
          INSERT INTO restaurants (owner_id, name, slug, timezone, currency, is_active, dashboard_config)
          VALUES (${demoAdminId}, 'Restaurante Demo FOODIFY', 'demo-restaurant',
                  'America/Monterrey', 'MXN', 1,
                  '{"show_sales":true,"show_top_dishes":true,"show_peak_hours":true,"show_category_income":true,"show_dishes_by_menu":true}')
        `);
        const demoRest = await queryRunner.query(
          `SELECT id FROM restaurants WHERE slug = 'demo-restaurant'`
        );
        const demoRestId = demoRest[0]?.id;

        // Actualizar restaurant_id del admin
        await queryRunner.query(
          `UPDATE users SET restaurant_id = ${demoRestId} WHERE id = ${demoAdminId}`
        );

        // Suscripción trial para el restaurante demo
        const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        // MySQL DATETIME no acepta ISO con "T" y "Z" (ej: 2026-04-25T20:39:57.275Z)
        // Formato esperado: YYYY-MM-DD HH:mm:ss
        const trialEndSql = trialEnd.toISOString().slice(0, 19).replace('T', ' ');

        // Usar el ID real del plan Premium (no asumir que es 2).
        const premiumPlan = await queryRunner.query(
          `SELECT id FROM saas_plans WHERE name = 'Premium' LIMIT 1`
        );
        const premiumPlanId = premiumPlan[0]?.id;
        if (!premiumPlanId) {
          throw new Error('No se encontró el plan Premium en saas_plans');
        }

        await queryRunner.query(`
          INSERT INTO saas_subscriptions
            (restaurant_id, plan_id, status, amount_mxn, trial_ends_at, next_billing_at, current_period_end)
          VALUES
            (${demoRestId}, ${premiumPlanId}, 'trial', 2500.00, '${trialEndSql}',
             '${trialEndSql}', '${trialEndSql}')
        `);

        console.log(`[Seed] Restaurante demo creado (slug: demo-restaurant)`);
        console.log(`[Seed] Admin demo: admin@demo.foodify.mx / Demo2026!`);
      }
    }

    await queryRunner.commitTransaction();
    console.log('[Seed] Seeds ejecutados exitosamente');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('[Seed] Error en seeds:', err.message);
    throw err;
  } finally {
    await queryRunner.release();
  }
}
