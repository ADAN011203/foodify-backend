# 🍽 Foodify Backend

Backend de la plataforma SaaS **Foodify** — Sistema de gestión para restaurantes.

**Stack:** NestJS 10 · TypeORM · MySQL 8 · Redis 7 · Socket.io · JWT

**Equipo CODEX · Universidad Tecnológica de Jalisco · 2026**

---

## 📋 Requisitos previos

Instala estas herramientas antes de continuar:

| Herramienta | Versión | Descarga |
|-------------|---------|----------|
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | Última | https://docker.com/products/docker-desktop |
| Git | Última | https://git-scm.com/download/win |
| Postman | Última | https://postman.com/downloads |

---

## 🚀 Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/alexmunoz1096/foodify-backend.git
cd foodify-backend
```

### 2. Configurar variables de entorno

**Windows:**
```bash
copy .env.example .env
notepad .env
```

**Mac / Linux:**
```bash
cp .env.example .env
```

Abre el `.env` y cambia esta línea:

```env
# Cambiar:
DATABASE_HOST=localhost

# Por:
DATABASE_HOST=127.0.0.1
```

> El resto de variables ya están listas para desarrollo local.

### 3. Abrir Docker Desktop

Abre **Docker Desktop** desde el menú Inicio de Windows y espera a que el ícono de la ballena en la barra de tareas esté **quieto** (no animado). Eso indica que el motor está listo.

### 4. Levantar MySQL y Redis

```bash
docker compose up mysql redis -d
```

Verifica que estén corriendo correctamente:

```bash
docker ps
```

Debes ver los dos contenedores con estado **(healthy)**:

```
CONTAINER ID   IMAGE          STATUS
abc123         mysql:8.0      Up 30s (healthy)
def456         redis:7-alpine Up 30s (healthy)
```

> Si dice **(starting)**, espera 30 segundos y vuelve a ejecutar `docker ps`.

### 5. Instalar dependencias de Node.js

```bash
npm install
```

Tarda aproximadamente 60 segundos la primera vez.

### 6. Crear las tablas en la base de datos

```bash
npm run migration:run
```

Al final debe aparecer:

```
All migrations ran successfully.
```

### 7. Cargar datos iniciales

```bash
npm run seed
```

Crea automáticamente los planes, el usuario administrador de CODEX y un restaurante demo:

```
✅ Plan Básico creado       — $1,500 MXN/mes
✅ Plan Premium creado      — $2,500 MXN/mes
✅ saas_admin creado        — admin@codex.foodify.mx / Codex2026!
✅ Demo admin creado        — admin@demo.foodify.mx / Demo2026!
✅ Restaurante demo creado  — slug: demo-restaurant
```

### 8. Iniciar el servidor

```bash
npm run start:dev
```

Cuando veas este mensaje el servidor está listo para recibir peticiones:

```
🍽  Foodify Backend running on http://localhost:3001
🔌 WebSocket namespaces: /kitchen  /restaurant
🌍 Env: development
```

---

## ▶️ Las próximas veces

Una vez que hiciste el setup completo, solo necesitas estos comandos cada vez que quieras trabajar:

```bash
# Levantar base de datos
docker compose up mysql redis -d

# Obtener cambios del equipo
git pull

# Iniciar el servidor
npm run start:dev
```

---

## 🧪 Pruebas con Postman

El archivo `FOODIFY_Postman_Collection_v3_1.json` ya está incluido en este repositorio.

### Importar la colección

1. Abre **Postman**
2. Click en **Import** (arriba a la izquierda)
3. Arrastra el archivo `FOODIFY_Postman_Collection_v3_1.json` a la ventana
4. Click en **Import**

Verás la colección **"FOODIFY API v3.1"** con 13 carpetas y 101 peticiones.

### Configurar la URL base

1. Click en **"FOODIFY API v3.1"** en el panel izquierdo
2. Click en la pestaña **Variables**
3. Cambia el valor de `base_url` de `http://localhost:3000` a `http://localhost:3001`
4. Guarda con **Ctrl+S**

### Hacer el primer Login

1. Abre la carpeta **🔐 Auth**
2. Click en **"Login (saas_admin CODEX)"**
3. Click en el botón azul **Send**

Respuesta esperada `200 OK`:

```json
{
  "data": {
    "user": {
      "id": 1,
      "role": "saas_admin",
      "email": "admin@codex.foodify.mx"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  },
  "status": 200
}
```

> El `accessToken` se guarda automáticamente en la variable `{{access_token}}`. Todos los demás endpoints lo usan sin configuración adicional.

---

## 🔑 Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| saas_admin (CODEX) | admin@codex.foodify.mx | Codex2026! |
| restaurant_admin (demo) | admin@demo.foodify.mx | Demo2026! |

---

## 📁 Endpoints principales

| Carpeta Postman | Descripción |
|-----------------|-------------|
| 🔐 Auth | Login, refresh token, recuperar contraseña |
| 👑 Panel SaaS CODEX | KPIs globales, alta de clientes, suscripciones, pagos |
| 🌐 Menú Público (SIN JWT) | Menú del restaurante para comensales — sin login |
| 🏠 Restaurantes | Gestión del restaurante |
| 📋 Menús | Crear y administrar menús con horarios |
| 🍝 Platillos | Catálogo de platillos, recetas, imágenes |
| 📦 Inventario FIFO | Insumos, lotes, movimientos, alertas |
| 🛎️ Pedidos | Crear pedidos, cambiar estados |
| 👨‍🍳 Módulo Cocina | Board de comandas en tiempo real |
| 📊 Reportes | Ventas, horas pico, exportación XLSX |
| 🧪 QA — Casos de Prueba | Pruebas del sistema de planes y horarios |

---

## 🌐 Servicios disponibles

| Servicio | URL |
|---------|-----|
| REST API | http://localhost:3001 |
| WebSocket Cocina | ws://localhost:3001/kitchen |
| WebSocket Restaurante | ws://localhost:3001/restaurant |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

---

## 🛠️ Comandos útiles

```bash
# Ver contenedores corriendo
docker ps

# Ver logs de MySQL
docker logs foodify_mysql

# Parar los contenedores
docker compose down

# Revertir la última migración
npm run migration:revert

# Compilar el proyecto
npm run build

# Correr en producción
npm run start:prod
```

---

## ❗ Solución de errores comunes

| Error | Causa | Solución |
|-------|-------|---------|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL no está corriendo | Ejecutar `docker compose up mysql redis -d` |
| `Cannot GET /` en Postman | URL incorrecta | Verificar que `base_url` sea `http://localhost:3001` |
| `docker compose` abre un archivo | Estás en WSL en lugar de PowerShell | Abrir PowerShell con Windows+R → `powershell` |
| `Table doesn't exist` | Migraciones no ejecutadas | Ejecutar `npm run migration:run` |
| Token expirado en Postman | El accessToken dura 15 minutos | Ejecutar Login de nuevo |
| `port already in use` | El puerto 3001 está ocupado | Cambiar `PORT=3002` en `.env` |

---

## 👥 Equipo CODEX

**Universidad Tecnológica de Jalisco · Marzo 2026**

- Alejandro — Backend NestJS + App Móvil UI
- Jorge — App Móvil Android Integración
- Adán — PWA Next.js
- Daniel Antonio / Gloria — PWA Auth + QA

---

*Foodify v3.1 · Equipo CODEX · UTJ · 2026*
