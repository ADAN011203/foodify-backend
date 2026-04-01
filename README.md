# 🍽 Foodify Backend (v3.2)

Backend de la plataforma SaaS **Foodify** — Sistema de gestión para restaurantes.

**Stack:** NestJS 10 · TypeORM · MySQL 8 · Redis 7 · Socket.io · JWT · Docker

**Equipo CODEX · Universidad Tecnológica de Jalisco · 2026**

---

## 📋 Requisitos previos

Para poder levantar el entorno completo, ya sea en un solo click con Docker, o para desarrollo manual, necesitas estas herramientas:

| Herramienta | Versión | Descarga |
|-------------|---------|----------|
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | Última | https://docker.com/products/docker-desktop |
| Git | Última | https://git-scm.com/download/win |
| Postman | Última | https://postman.com/downloads |

---

## 🚀 Instalación Automática (Vía Docker - Recomendado)

Usar contenedores construirá la aplicación de Nest junto a la base de datos MySQL y Redis en un solo comando sin necesidad de lidiar con C++, Node o NPM en tu computadora.

### 1. Clonar el repositorio y configurar
```bash
git clone https://github.com/alexmunoz1096/foodify-backend.git
cd foodify-backend
copy .env.example .env
```
*(No necesitas modificar el `.env` para que funcione, Docker se encarga de conectar la API e inyectar el puerto 3000 automáticamente).*

### 2. Abrir Docker Desktop y ejecutar Todo
Espera a que Docker abra en tu PC, y en la terminal ejecuta:
```bash
docker compose up --build -d
```
**(Tardará aprox. 2 minutos la primera vez)**. ¡Y listo! Tu servidor NestJS, DB y Redis ya están corriendo listos para recibir peticiones en el puerto `3000`.

---

## 🛠 Instalación Manual para Desarrollo (Node local)

Si prefieres apagar la API de Docker y compilar el código manualmente al ir programando (modo *Watch*):

1. **Enciende solo las bases de datos de Docker:**
   ```bash
   docker compose up mysql redis -d
   ```
2. **Edita tu `.env` local para correrlo manual:**  
   Cambia `DATABASE_HOST=localhost` y `DATABASE_PORT=3307`.
3. **Instala librerías y reinicia BD:**
   ```bash
   npm install
   npm run migration:run
   npm run seed
   npm run start:dev
   ```

---

## 🧪 Pruebas con Postman

El archivo `Foodify_v3.2_Postman_Collection.json` ya está incluido en la raíz de este repositorio.

### Importar la colección
1. Abre **Postman** y dale click en **Import** (arriba a la izquierda).
2. Arrastra el JSON o búscalo en tus carpetas.
3. Verás la colección **"FOODIFY API v3.2 — Equipo CODEX"**.

### Hacer el primer Login (Automático)
1. Abre la carpeta **🔐 Auth**.
2. Click en **"Login (saas_admin CODEX)"** y oprime **Send**.
3. El `accessToken` provisto por el servidor se guardará solo en las variables de Postman para el resto de las peticiones.

---

## 🔑 Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| saas_admin (CODEX) | admin@codex.foodify.mx | Codex2026! |
| restaurant_admin (demo) | admin@demo.foodify.mx | Demo2026! |
| waiter (mesero) | mesero@demo.foodify.mx | Staff2026! |
| cashier (cajero) | cajero@demo.foodify.mx | Staff2026! |
| chef (cocina) | cocina@demo.foodify.mx | Staff2026! |

---

## 📁 Endpoints principales

| Carpeta Postman | Descripción |
|-----------------|-------------|
| 🔐 Auth | Login, refresh token, recuperar contraseña, Perfil |
| 👑 Panel SaaS CODEX | KPIs globales, alta de clientes, suscripciones, pagos |
| 🌐 Menú Público (SIN JWT) | Menú del restaurante para comensales (PWA) |
| 🏠 Restaurantes | Gestión del restaurante (Dashboard, Info) |
| 📋 Menús | Crear y administrar menús con horarios lógicos |
| 🍝 Platillos | Catálogo de platillos, recetas, ingredientes |
| 📦 Inventario FIFO | Insumos, lotes de entradas, mermas |
| 🛎️ Pedidos | Crear pedidos desde Android o PWA |
| 👨🍳 Módulo Cocina | Board WebSocket para comandas del Chef |
| 📊 Reportes | Cierres de caja y Excel XLSX |

---

## 🌐 Servicios y Puertos en uso

| Servicio | URL |
|---------|-----|
| REST API | http://localhost:3000 |
| WebSocket Cocina | ws://localhost:3000/kitchen |
| WebSocket Restaurante | ws://localhost:3000/restaurant |
| MySQL Host Ext. | localhost:3307 |
| Redis Host Ext. | localhost:6379 |

---

## 🗄️ Ver y Administrar la Base de Datos

Como el entorno se inicializa automáticamente vía Docker, la base de datos ya cuenta con las tablas necesarias. Existen dos formas principales para revisarla:

### Opción 1: Cliente Gráfico (DBeaver, TablePlus o Workbench)
Crea una nueva conexión de tipo MySQL en tu gestor favorito usando estas credenciales:
- **Host:** `localhost` (o `127.0.0.1`)
- **Puerto:** `3307`
- **Usuario:** `foodify`
- **Contraseña:** `foodify_pass`
- **Base de datos:** `foodify_db`

### Opción 2: Desde la Terminal (Comandos Docker)
Puedes entrar directamente a la consola interactiva de MySQL que corre en el contenedor:
```bash
docker exec -it foodify_mysql mysql -u foodify -pfoodify_pass foodify_db
```
Una vez que el prompt cambie a `mysql>`, puedes ejecutar los siguientes comandos y terminar cada uno con `;`:
- `SHOW TABLES;` *(Lista todas las tablas creadas)*.
- `DESCRIBE saas_plans;` *(Muestra las columnas de una tabla dada)*.
- `SELECT * FROM saas_plans;` *(Extrae los registros guardados en la tabla)*.
- Para volver a la línea de comandos de tu computadora, escribe `exit;`.

---

## 🛠️ Comandos útiles

```bash
# Ver estatus de la App, MySQL y Redis
docker ps

# Ver todo lo que imprime la consola de NestJS real-time
docker compose logs -f app

# Apagar de forma segura
docker compose down

# Apagar y borrar bases de datos por si cometiste un error
docker compose down -v
```

---

## ❗ Solución de errores comunes

| Error | Causa | Solución |
|-------|-------|---------|
| `ECONNREFUSED 127.0.0.1:3306` ejecutando comandos localmente (`migration:run`) | TypeORM intenta conectar por defecto al puerto `3306`, pero Docker expone MySQL en el puerto `3307` en la máquina local. | Asegúrate de que tu archivo `.env` local tenga `DATABASE_PORT=3307`.|
| `ECONNREFUSED` / No DB en Docker | MySQL no levantó a tiempo | Manda otra vez `docker compose up -d` |
| Nest tira `TypeError TS2...` | Typescript estricto no pasó | Haz `npx tsc --noEmit` para ver qué línea rompe el código |
| `Cannot GET /` en Postman | URL incorrecta | Verifica usar `http://localhost:3000` |
| Cambios al código no se ven | Falló el Build del cache docker | Corre `docker compose up --build -d` |

---

## 👥 Equipo CODEX

**Universidad Tecnológica de Jalisco · Marzo 2026**

- **Alejandro** — Backend NestJS + App Móvil UI
- **Jorge** — App Móvil Android Integración
- **Adán** — PWA Next.js
- **Daniel Antonio Gloria** — PWA Auth + QA

---

*Foodify v3.2 · Equipo CODEX · UTJ · 2026*
