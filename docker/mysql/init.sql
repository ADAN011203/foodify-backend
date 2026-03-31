-- RUTA: docker/mysql/init.sql
-- Script de inicialización de MySQL
-- Solo se ejecuta cuando el contenedor se crea por primera vez
-- Las migraciones TypeORM crean todas las tablas

-- Configurar charset global
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

-- Confirmar que la base de datos existe con el charset correcto
CREATE DATABASE IF NOT EXISTS foodify_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE foodify_db;

-- Permisos del usuario foodify
GRANT ALL PRIVILEGES ON foodify_db.* TO 'foodify'@'%';
FLUSH PRIVILEGES;

-- Mensaje de confirmación
SELECT 'Base de datos FOODIFY inicializada correctamente' AS mensaje;
