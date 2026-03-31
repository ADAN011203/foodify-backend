import { AppDataSource } from '../../config/database.config';
import { runSeeds }      from './initial.seed';

async function main() {
  await AppDataSource.initialize();
  // Diagnóstico: confirmar DB/connection donde se van a ejecutar los seeds
  try {
    const dbRow: any[] = await AppDataSource.query('SELECT DATABASE() AS db');
    const opts: any = AppDataSource.options;
    console.log(
      '[Seed] Conectado a:',
      `${opts.host}:${opts.port}/${opts.database}`,
      'DBActual=',
      dbRow?.[0]?.db,
    );
    const plansCount: any[] = await AppDataSource.query('SELECT COUNT(*) AS c FROM saas_plans');
    console.log('[Seed] saas_plans antes:', plansCount?.[0]?.c ?? 'n/a');
  } catch (e: any) {
    console.log('[Seed] No se pudo diagnosticar conexión:', e?.message ?? e);
  }
  await runSeeds(AppDataSource);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('[Seed] Error al ejecutar seeds:', err?.message ?? err);
  process.exit(1);
});

