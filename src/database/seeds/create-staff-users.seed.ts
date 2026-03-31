/**
 * RUTA: src/database/seeds/create-staff-users.seed.ts
 *
 * Crea (o actualiza) los 3 perfiles de staff para la App Android:
 *   - Mesero   → rol: waiter
 *   - Cajero   → rol: cashier
 *   - Cocina   → rol: chef
 *
 * Todos asociados al restaurante demo existente.
 *
 * Ejecutar con:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/create-staff-users.seed.ts
 *
 * Credenciales resultado:
 *   mesero@demo.foodify.mx   / Staff2026!  → waiter
 *   cajero@demo.foodify.mx   / Staff2026!  → cashier
 *   cocina@demo.foodify.mx   / Staff2026!  → chef
 */
import 'reflect-metadata';
import { AppDataSource } from '../../config/database.config';
import * as bcrypt from 'bcrypt';

async function main() {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Obtener restaurante demo
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

    // Hash bcrypt para contraseña "Staff2026!"
    const hash = await bcrypt.hash('Staff2026!', 12);

    const staffUsers = [
      {
        email: 'mesero@demo.foodify.mx',
        fullName: 'Mesero Demo',
        role: 'waiter',
        label: 'Mesero',
      },
      {
        email: 'cajero@demo.foodify.mx',
        fullName: 'Cajero Demo',
        role: 'cashier',
        label: 'Cajero',
      },
      {
        email: 'cocina@demo.foodify.mx',
        fullName: 'Chef Cocina Demo',
        role: 'chef',
        label: 'Cocina (Chef)',
      },
    ];

    for (const u of staffUsers) {
      const exists = await queryRunner.query(
        `SELECT COUNT(*) as c FROM users WHERE email = ?`,
        [u.email],
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
        console.log(`✅ Creado: ${u.email} → ${u.role} (${u.label})`);
      }
    }

    await queryRunner.commitTransaction();

    console.log('\n🎉 ¡Perfiles de Staff listos!\n');
    console.log('┌──────────────────────────────────┬────────────┬──────────────┐');
    console.log('│ Email                            │ Contraseña │ Perfil       │');
    console.log('├──────────────────────────────────┼────────────┼──────────────┤');
    console.log('│ mesero@demo.foodify.mx           │ Staff2026! │ Mesero       │');
    console.log('│ cajero@demo.foodify.mx           │ Staff2026! │ Cajero       │');
    console.log('│ cocina@demo.foodify.mx           │ Staff2026! │ Cocina(Chef) │');
    console.log('└──────────────────────────────────┴────────────┴──────────────┘');
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
