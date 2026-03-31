#!/bin/sh
# RUTA: docker/entrypoint.sh
# Script de entrada del contenedor NestJS:
# 1. Espera a que MySQL esté listo
# 2. Ejecuta migraciones TypeORM
# 3. Ejecuta seeds iniciales (solo si la tabla está vacía)
# 4. Arranca el servidor

set -e

echo "=================================================="
echo "  🍽  FOODIFY Backend v3.2"
echo "  Entorno: $NODE_ENV"
echo "=================================================="

# ── Esperar MySQL ─────────────────────────────────────────
echo "⏳ Esperando a MySQL ($DATABASE_HOST:$DATABASE_PORT)..."
until node -e "
  const mysql = require('mysql2/promise');
  mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  }).then(c => { c.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "  MySQL no está listo todavía, reintentando en 3s..."
  sleep 3
done
echo "✅ MySQL disponible"

# ── Ejecutar migraciones ──────────────────────────────────
echo ""
echo "🔄 Ejecutando migraciones TypeORM (001 → 011)..."
node -e "
  const { DataSource } = require('typeorm');
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    migrations: ['dist/database/migrations/*.js'],
    charset: 'utf8mb4',
  });
  ds.initialize()
    .then(() => ds.runMigrations({ transaction: 'each' }))
    .then(migs => {
      console.log('  Migraciones ejecutadas:', migs.length > 0 ? migs.map(m => m.name).join(', ') : 'ninguna nueva');
      return ds.destroy();
    })
    .then(() => process.exit(0))
    .catch(err => { console.error('Error en migraciones:', err.message); process.exit(1); });
"
echo "✅ Migraciones completadas"

# ── Ejecutar seeds (solo primera vez) ────────────────────
echo ""
echo "🌱 Verificando seeds iniciales..."
node -e "
  const { DataSource } = require('typeorm');
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    charset: 'utf8mb4',
  });
  ds.initialize()
    .then(async () => {
      const [rows] = await ds.query('SELECT COUNT(*) as c FROM saas_plans');
      if (rows.c === '0' || rows.c === 0) {
        console.log('  Ejecutando seeds iniciales...');
        const { runSeeds } = require('./dist/database/seeds/initial.seed');
        await runSeeds(ds);
        console.log('  Seeds ejecutados correctamente.');
      } else {
        console.log('  Seeds ya existen, omitiendo.');
      }
      await ds.destroy();
      process.exit(0);
    })
    .catch(err => {
      console.error('  Error en seeds (no crítico):', err.message);
      process.exit(0); // No fallar por seeds
    });
"
echo "✅ Seeds verificados"

# ── Iniciar el servidor ───────────────────────────────────
echo ""
echo "🚀 Iniciando FOODIFY API en puerto 3001..."
echo "=================================================="
exec node dist/main.js
