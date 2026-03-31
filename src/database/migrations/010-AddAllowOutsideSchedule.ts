// RUTA: src/database/migrations/010-AddAllowOutsideSchedule.ts
// v3.1: campo allow_outside_schedule en menus
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowOutsideSchedule1710000000010 implements MigrationInterface {
  name = 'AddAllowOutsideSchedule1710000000010';
  public async up(q: QueryRunner): Promise<void> {
    // Ya incluido en migración 004 para nuevas instalaciones.
    // Esta migración existe para bases de datos existentes.
    await q.query(`
      ALTER TABLE menus
      ADD COLUMN IF NOT EXISTS allow_outside_schedule TINYINT(1) NOT NULL DEFAULT 1
      COMMENT 'true=acepta pedidos fuera del horario (default), false=solo en horario'
    `).catch(() => {/* column already exists */});
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE menus DROP COLUMN IF EXISTS allow_outside_schedule`).catch(() => {});
  }
}
