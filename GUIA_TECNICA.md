# 🍽 FOODIFY — Guía Técnica de Setup y Desarrollo

**Equipo CODEX · Universidad Tecnológica de Jalisco · Versión 1.0**

---

## ¿Por qué Docker?

Con 4 integrantes, Docker garantiza que **todos trabajan con exactamente el mismo entorno** sin instalar MySQL ni Redis manualmente. Un solo comando levanta todo.

---

## Requisitos previos (instalar en cada máquina)

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|----------|
| Docker Desktop | 4.x | https://docker.com/products/docker-desktop |
| Node.js | 20 LTS | https://nodejs.org |
| Git | 2.x | https://git-scm.com |
| VS Code | Cualquiera | https://code.visualstudio.com |

**Extensiones recomendadas para VS Code:**
- ESLint
- Prettier
- REST Client (para probar la API sin Postman)
- Thunder Client
- Docker

---

## PASO 1 — Clonar el repositorio

```bash
git clone https://github.com/tu-equipo/foodify-backend.git
cd foodify-backend
```

---

## PASO 2 — Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con los valores de desarrollo:

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=foodify
DATABASE_PASSWORD=foodify_pass
DATABASE_NAME=foodify_db

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_ACCESS_SECRET=foodify_access_secret_dev_256bits_change_me
JWT_REFRESH_SECRET=foodify_refresh_secret_dev_256bits_change_me
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# AWS S3 (dejar vacío en dev si no tienes cuenta)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=us-east-1

# Firebase (dejar vacío en dev)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Stripe (dejar vacío en dev)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

SMTP_HOST=
SMTP_FROM=noreply@foodify.mx

CORS_ORIGINS=http://localhost:3001,http://localhost:3002
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

> **Nota:** En desarrollo, S3, Firebase, Stripe y SMTP son opcionales.
> El sistema funcionará en modo "console fallback" — mostrará los mensajes en terminal en lugar de enviarlos.

---

## PASO 3 — Levantar MySQL y Redis con Docker

```bash
docker-compose up mysql redis -d
```

Verifica que ambos contenedores estén sanos:

```bash
docker ps
```

Deberías ver:
```
foodify_mysql   Up (healthy)
foodify_redis   Up (healthy)
```

---

## PASO 4 — Instalar dependencias Node

```bash
npm install
```

---

## PASO 5 — Ejecutar migraciones (crear tablas)

```bash
npm run migration:run
```

Las migraciones se ejecutan en orden (001 al 009) y crean:
- `saas_plans`, `saas_subscriptions`, `payment_transactions`
- `users`, `refresh_tokens`
- `restaurants`, `tables`
- `menus`, `menu_categories`
- `dishes`, `recipes`, `recipe_ingredients`
- `inventory_items`, `inventory_lots`, `inventory_movements`, `inventory_alerts`
- `orders`, `order_items`
- `kitchen_sessions`
- Triggers FIFO MySQL

---

## PASO 6 — Ejecutar seeds (datos iniciales)

```bash
npm run seed
```

Esto crea:
- Los 3 planes SaaS: **Básico** ($1,500 MXN), **Premium** ($2,500 MXN), **Enterprise** ($4,500 MXN)
- Usuario `saas_admin`: `admin@codex.foodify.mx` / `Codex2026!`
- Restaurante demo con usuario `admin@demo.foodify.mx` / `Demo2026!`

> ⚠️ **Cambia las contraseñas inmediatamente en producción.**

---

## PASO 7 — Iniciar el servidor

```bash
# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build && npm run start:prod
```

El servidor arranca en:
- **REST API:** `http://localhost:3000`
- **WebSocket /kitchen:** `ws://localhost:3000/kitchen`
- **WebSocket /restaurant:** `ws://localhost:3000/restaurant`

---

## PASO 8 — Verificar que todo funciona

### Prueba de login (saas_admin):
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@codex.foodify.mx","password":"Codex2026!"}'
```

Respuesta esperada:
```json
{
  "data": {
    "user": { "id": 1, "role": "saas_admin", "email": "admin@codex.foodify.mx" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  },
  "status": 200
}
```

### Prueba de KPIs SaaS:
```bash
curl http://localhost:3000/api/v1/admin/dashboard/kpis \
  -H "Authorization: Bearer <tu_access_token>"
```

---

## Estructura del proyecto

```
foodify-backend/
├── src/
│   ├── main.ts                    ← Bootstrap
│   ├── app.module.ts              ← Módulo raíz
│   ├── config/
│   │   ├── database.config.ts     ← TypeORM + MySQL
│   │   ├── redis.config.ts        ← Redis
│   │   └── env.validation.ts      ← Joi schema
│   ├── shared/
│   │   ├── guards/                ← JwtAuthGuard, RolesGuard
│   │   ├── decorators/            ← @Roles, @CurrentUser, @Public
│   │   ├── interceptors/          ← TransformResponseInterceptor
│   │   ├── filters/               ← AllExceptionsFilter
│   │   └── utils/                 ← pagination, s3, date-range, order-number
│   ├── modules/
│   │   ├── auth/                  ← Login, JWT, OTP, refresh
│   │   ├── users/                 ← CRUD usuarios
│   │   ├── restaurants/           ← CRUD restaurantes, logo, dashboard_config
│   │   ├── tables/                ← Mesas, QR codes
│   │   ├── menus/                 ← Múltiples menús con schedule JSON
│   │   ├── categories/            ← Categorías por menú
│   │   ├── dishes/                ← Platillos, imágenes S3, recetas
│   │   ├── inventory/             ← FIFO: items, lotes, movimientos, alertas
│   │   ├── orders/                ← Pedidos + WebSocket /restaurant
│   │   ├── kitchen/               ← Comandas + WebSocket /kitchen
│   │   ├── saas/                  ← KPIs globales, suscripciones
│   │   ├── payments/              ← Webhooks Stripe/Conekta
│   │   ├── reports/               ← Ventas, top platillos, exportación
│   │   └── notifications/         ← FCM push + Email
│   └── database/
│       ├── migrations/            ← 009 migraciones TypeORM
│       └── seeds/                 ← Datos iniciales
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## Roles y accesos

| Rol | Descripción | Plataforma |
|-----|-------------|-----------|
| `saas_admin` | CODEX — acceso total | PWA SaaS |
| `restaurant_admin` | Dueño del restaurante | Móvil + PWA |
| `manager` | Gerente | PWA |
| `waiter` | Mesero | Móvil |
| `chef` | Cocinero | Móvil (módulo cocina) |
| `cashier` | Cajero | PWA |

---

## Endpoints principales

### Auth
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/verify-otp
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
PATCH  /api/v1/auth/fcm-token
```

### Panel SaaS (saas_admin)
```
GET    /api/v1/admin/dashboard/kpis
GET    /api/v1/admin/restaurants
GET    /api/v1/admin/restaurants/:id
GET    /api/v1/admin/restaurants/:id/stats
GET    /api/v1/admin/subscriptions
PATCH  /api/v1/admin/subscriptions/:id
GET    /api/v1/admin/restaurants/:id/menus
GET    /api/v1/admin/restaurants/:id/dishes/sold
```

### Restaurante
```
GET    /api/v1/restaurants
POST   /api/v1/restaurants
PUT    /api/v1/restaurants/:id
PUT    /api/v1/restaurants/:id/logo
PATCH  /api/v1/restaurants/:id/settings   ← dashboard_config toggles
GET    /api/v1/restaurants/:id/dashboard
```

### Menús y Platillos
```
GET/POST            /api/v1/menus
PUT/PATCH/DELETE    /api/v1/menus/:id
GET/POST            /api/v1/menus/:id/categories
GET/POST            /api/v1/dishes
PUT/:id  PATCH/:id/availability  DELETE/:id
PUT      /api/v1/dishes/:id/images
GET/PUT  /api/v1/dishes/:id/recipe
```

### Módulo Cocina (chef)
```
GET    /api/v1/kitchen/orders                ← comandas activas
GET    /api/v1/kitchen/orders/:id
PATCH  /api/v1/kitchen/orders/:id/status
PATCH  /api/v1/kitchen/order-items/:id/status
GET    /api/v1/kitchen/dishes
GET    /api/v1/kitchen/dishes/:id/recipe
GET    /api/v1/kitchen/stats
POST   /api/v1/kitchen/sessions/start
PATCH  /api/v1/kitchen/sessions/:id/end
```

### Pedidos (waiter/admin)
```
POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/active
PATCH  /api/v1/orders/:id/status
POST   /api/v1/orders/:id/items
PATCH  /api/v1/orders/:id/cancel
```

### Reportes (admin/manager)
```
GET    /api/v1/reports/sales?period=month
GET    /api/v1/reports/dishes/top?period=week&limit=10
GET    /api/v1/reports/dishes/sold?menuId=1&period=month
GET    /api/v1/reports/peak-hours
GET    /api/v1/reports/category-income
GET    /api/v1/reports/inventory/cost
GET    /api/v1/reports/staff
GET    /api/v1/reports/kitchen/performance
GET    /api/v1/reports/export?type=sales&format=xlsx
```

---

## WebSockets

### Conectar desde Android/PWA
```javascript
// Namespace /kitchen (para el chef)
const socket = io('http://localhost:3000/kitchen', {
  auth: { token: 'Bearer eyJ...' }
});

// Namespace /restaurant (para mesero/admin)
const socket = io('http://localhost:3000/restaurant', {
  auth: { token: 'Bearer eyJ...' }
});
```

### Eventos /kitchen
| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `order:new` | Server → Chef | Nueva comanda recibida |
| `order:cancelled` | Server → Chef | Comanda cancelada |
| `order:item:start` | Chef → Server | Chef inicia ítem |
| `order:item:ready` | Chef → Server | Chef marca ítem listo |
| `order:ready` | Server → Chef | Toda la comanda lista |

### Eventos /restaurant
| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `order:status` | Server → Mesero | Cambio de estado del pedido |
| `order:ready` | Server → Mesero | Pedido listo para entregar |
| `order:delivered` | Server → Admin | Pedido entregado |
| `inventory:alert` | Server → Admin | Alerta de inventario |
| `dish:unavailable` | Server → Admin | Platillo desactivado automáticamente |

---

## División de trabajo recomendada

| Módulo | Archivos clave | Responsable sugerido |
|--------|----------------|---------------------|
| Auth + Users | `auth/`, `users/` | Alejandro (backend) |
| Orders + Kitchen WS | `orders/`, `kitchen/` | Alejandro (backend) |
| Inventory FIFO | `inventory/` | Alejandro (backend) |
| App Android — Cocina | `KitchenViewModel`, `KitchenFragment` | Jorge |
| App Android — Mesero | `WaiterFragment`, `OrdersAdapter` | Jorge |
| App Android — Admin | `DashboardFragment`, `InventoryFragment` | Jorge |
| PWA — Dashboard + Gráficas | Recharts, reportes | Adán |
| PWA — Gestión Menú + Config | Menús, categorías, toggles | Adán |
| PWA — Panel SaaS | KPIs, suscripciones, pagos | Daniel Antonio |

---

## Comandos útiles

```bash
# Levantar todo con Docker (DB + Redis + App)
docker-compose up -d

# Solo DB y Redis (y correr NestJS local para hot-reload)
docker-compose up mysql redis -d
npm run start:dev

# Ver logs de MySQL
docker logs foodify_mysql --follow

# Conectar a MySQL desde terminal
docker exec -it foodify_mysql mysql -u foodify -pfoodify_pass foodify_db

# Generar nueva migración (después de cambiar una entity)
npm run migration:generate -- src/database/migrations/010-NombreDeMigracion

# Revertir última migración
npm run migration:revert

# Ver estado de migraciones
npm run typeorm -- migration:show -d src/config/database.config.ts

# Correr tests
npm run test

# Lint
npm run lint
```

---

## Variables de entorno en producción

En producción (servidor/VPS) configurar **siempre**:
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` con cadenas aleatorias de 64+ caracteres
- `AWS_*` para almacenamiento de imágenes real
- `FIREBASE_*` para push notifications
- `STRIPE_*` o `CONEKTA_*` para webhooks de pagos
- `SMTP_*` para emails transaccionales

---

## Flujo FIFO — cómo funciona

1. Se crean **lotes** (`inventory_lots`) con `entry_date` y `unit_cost`
2. Cada platillo tiene una **receta** con ingredientes vinculados a `inventory_items`
3. Cuando un pedido cambia a `delivered`:
   - El **trigger MySQL** `after_order_delivered` se dispara automáticamente
   - Descuenta los ingredientes de los lotes más antiguos (FIFO por `entry_date ASC`)
   - Actualiza `current_stock` en `inventory_items`
   - Si stock = 0 → desactiva platillos (`is_available = 0`)
   - Si stock < `min_stock` → crea alerta en `inventory_alerts`

---

## Módulo Cocina — flujo de estados

```
[PEDIDO CREADO] → kitchen_status: pending
       ↓ Chef presiona "Iniciar Preparación"
kitchen_status: preparing
       ↓ Chef marca cada ítem como ready
       ↓ Cuando TODOS los ítems = ready (trigger automático)
kitchen_status: ready  ←── WebSocket order:ready → mesero
       ↓ Mesero confirma entrega
kitchen_status: delivered  ←── Trigger FIFO se ejecuta
```

---

*FOODIFY · Equipo CODEX · UTJ · Marzo 2026*
