import { DataSource } from 'typeorm';

export async function runTablesSeed(ds: DataSource) {
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  
  try {
    const existing = await queryRunner.query(`SELECT COUNT(*) as c FROM tables WHERE restaurant_id = 3`);
    if (Number(existing[0].c) === 0) {
      await queryRunner.query(`
        INSERT IGNORE INTO tables (restaurant_id, number, capacity, status, qr_code_url) VALUES
        (3, 1, 4, 'available', 'https://menu.foodify.mx/mesa/3-1'),
        (3, 2, 4, 'available', 'https://menu.foodify.mx/mesa/3-2'),
        (3, 3, 4, 'available', 'https://menu.foodify.mx/mesa/3-3'),
        (3, 4, 6, 'available', 'https://menu.foodify.mx/mesa/3-4'),
        (3, 5, 2, 'available', 'https://menu.foodify.mx/mesa/3-5'),
        (3, 6, 4, 'available', 'https://menu.foodify.mx/mesa/3-6'),
        (3, 7, 2, 'available', 'https://menu.foodify.mx/mesa/3-7'),
        (3, 8, 4, 'available', 'https://menu.foodify.mx/mesa/3-8')
      `);
      console.log('[Seed] Mesas de prueba creadas o actualizadas para restaurant_id = 3');
    }
  } catch (err) {
    console.error('[Seed] Error al seedear mesas:', err.message);
  } finally {
    await queryRunner.release();
  }
}
