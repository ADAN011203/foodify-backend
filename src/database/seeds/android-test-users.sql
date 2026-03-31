-- ============================================================
-- RUTA: src/database/seeds/android-test-users.sql
-- Usuarios de prueba para la App Android (CODEX - Jorge)
-- IMPORTANTE: Ejecutar SOLO en entorno de desarrollo local.
-- Contraseña de todos: cualquier6 (hash bcrypt incluido)
-- Generado con: bcrypt.hash('cualquier6', 12) → se precalcula abajo.
-- ============================================================

-- Verificar que el restaurante demo existe antes de insertar
SET @restId = (SELECT id FROM restaurants WHERE slug = 'demo-restaurant' LIMIT 1);

-- Admin Foodify (restaurant_admin)
-- email: admin@foodify.com / password: cualquier6
INSERT INTO users (restaurant_id, role, full_name, email, password_hash, is_active)
SELECT
  @restId,
  'restaurant_admin',
  'Admin Foodify',
  'admin@foodify.com',
  '$2b$12$LEnYt9J3ByIGxNyHdKx8/OOuQ5lJTAVHIlgNDEqhOxfB5MEjV4Oly',
  1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@foodify.com');

-- Maria Garcia (waiter/mesero)
-- email: maria.garcia@foodify.com / password: cualquier6
INSERT INTO users (restaurant_id, role, full_name, email, password_hash, is_active)
SELECT
  @restId,
  'waiter',
  'Maria Garcia',
  'maria.garcia@foodify.com',
  '$2b$12$LEnYt9J3ByIGxNyHdKx8/OOuQ5lJTAVHIlgNDEqhOxfB5MEjV4Oly',
  1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'maria.garcia@foodify.com');

-- Chef (cocina)
-- email: chef@foodify.com / password: cualquier6
INSERT INTO users (restaurant_id, role, full_name, email, password_hash, is_active)
SELECT
  @restId,
  'chef',
  'Chef Principal',
  'chef@foodify.com',
  '$2b$12$LEnYt9J3ByIGxNyHdKx8/OOuQ5lJTAVHIlgNDEqhOxfB5MEjV4Oly',
  1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'chef@foodify.com');

-- Verificar resultado
SELECT id, email, role, is_active FROM users WHERE email IN (
  'admin@foodify.com',
  'maria.garcia@foodify.com',
  'chef@foodify.com'
);
