/**
 * RUTA: src/database/seeds/create-android-users.seed.ts
 *
 * Crea (o actualiza) los usuarios de prueba para la App Android de Jorge.
 * Asocia cada usuario al restaurante demo existente.
 *
 * Ejecutar con:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/create-android-users.seed.ts
 *
 * Credenciales resultado:
 *   admin@foodify.com          / cualquier6  → restaurant_admin
 *   maria.garcia@foodify.com   / cualquier6  → waiter
 *   chef@foodify.com           / cualquier6  → chef
 */
import 'reflect-metadata';
import { AppDataSource } from '../../config/database.config';
import * as bcrypt from 'bcrypt';
import { runTablesSeed } from './tables.seed';

async function main() {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Correr semilla de mesas primero
    await runTablesSeed(AppDataSource);
    // Obtener el restaurante demo
    const restRows = await queryRunner.query(
      `SELECT id FROM restaurants WHERE slug = 'demo-restaurant' LIMIT 1`,
    );
    if (!restRows.length) {
      throw new Error(
        '❌ No se encontró el restaurante "demo-restaurant".\n' +
        '   Ejecuta primero: npm run seed',
      );
    }
    const restaurantId: number = restRows[0].id;
    console.log(`✅ Restaurante demo encontrado (id: ${restaurantId})`);

    // Hash bcrypt para contraseña "cualquier6"
    const hash = await bcrypt.hash('cualquier6', 12);

    const androidUsers = [
      { email: 'admin@foodify.com',       fullName: 'Admin Foodify',  role: 'restaurant_admin' },
      { email: 'maria.garcia@foodify.com', fullName: 'Maria Garcia',   role: 'waiter'           },
      { email: 'chef@foodify.com',         fullName: 'Chef Principal', role: 'chef'             },
    ];

    for (const u of androidUsers) {
      const exists = await queryRunner.query(
        `SELECT COUNT(*) as c FROM users WHERE email = ?`, [u.email],
      );
      if (Number(exists[0].c) > 0) {
        await queryRunner.query(
          `UPDATE users
           SET password_hash = ?, restaurant_id = ?, role = ?, is_active = 1
           WHERE email = ?`,
          [hash, restaurantId, u.role, u.email],
        );
        console.log(`🔄 Actualizado: ${u.email} → ${u.role}`);
      } else {
        await queryRunner.query(
          `INSERT INTO users (restaurant_id, role, full_name, email, password_hash, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [restaurantId, u.role, u.fullName, u.email, hash],
        );
        console.log(`✅ Creado: ${u.email} → ${u.role}`);
      }
    }

    await queryRunner.commitTransaction();

    console.log('\n🎉 ¡Usuarios Android listos para probar!\n');
    console.log('┌─────────────────────────────────┬────────────┬──────────────────┐');
    console.log('│ Email                           │ Contraseña │ Rol              │');
    console.log('├─────────────────────────────────┼────────────┼──────────────────┤');
    console.log('│ admin@foodify.com               │ cualquier6 │ restaurant_admin │');
    console.log('│ maria.garcia@foodify.com        │ cualquier6 │ waiter           │');
    console.log('│ chef@foodify.com                │ cualquier6 │ chef             │');
    console.log('└─────────────────────────────────┴────────────┴──────────────────┘');
  } catch (err: any) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

main();
