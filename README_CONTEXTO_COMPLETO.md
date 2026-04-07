# 🍽 FOODIFY Backend v3.2 — Contexto Completo

> **Propósito de este documento**: Proveer a otra IA (o desarrollador) el contexto COMPLETO del backend, su arquitectura, lógica de negocio, módulos, entidades, endpoints, guards, decoradores y flujos para que pueda entender, modificar o extender el sistema sin omisiones.

---

## 1. VISIÓN GENERAL DEL PROYECTO

**FOODIFY** es una plataforma SaaS multi-tenant para gestión de restaurantes, desarrollada por el **Equipo CODEX UTJ**. Cada restaurante es un tenant aislado por `restaurant_id`.

### Stack Tecnológico
- **Framework**: NestJS 10 (TypeScript 5)
- **Base de datos**: MySQL 8 (TypeORM 0.3)
- **Cache/Colas**: Redis 7 (BullMQ para colas, Socket.io adapter)
- **WebSockets**: Socket.io con Redis adapter (escalabilidad horizontal)
- **Autenticación**: JWT (Passport) — access token (15min) + refresh token (30d)
- **Seguridad**: Helmet, bcrypt, rate limiting (Throttler), ValidationPipe global
- **Push Notifications**: Firebase FCM (Solo Plan Premium)
- **Almacenamiento**: AWS S3 (imágenes de platillos y logos)
- **QR**: librería `qrcode` para generar QR en órdenes Para Llevar
- **Docker**: docker-compose con MySQL 8, Redis 7 y la app NestJS

### Infraestructura Docker
```yaml
# docker-compose.yml
services:
  mysql:    # Puerto host: 3307 → container: 3306
  redis:    # Puerto: 6379
  app:      # Puerto: 3000, depende de mysql y redis healthy
```

### Variables de Entorno (.env)
```
NODE_ENV, PORT
DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME, DATABASE_POOL_SIZE
REDIS_HOST, REDIS_PORT
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES(15m), JWT_REFRESH_EXPIRES(30d)
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_S3_REGION
FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CONEKTA_API_KEY
THROTTLE_TTL(60), THROTTLE_LIMIT(100)
CORS_ORIGINS (separados por coma)
```

---

## 2. MODELO SaaS — PLANES Y PLATAFORMAS

### Dos Planes
| Característica | Plan Básico | Plan Premium |
|---|---|---|
| PWA Admin (dashboard) | ✅ | ✅ |
| PWA Pública (menú digital + Para Llevar) | ✅ | ✅ |
| App Android (waiter/chef/cashier) | ❌ | ✅ |
| Módulo Cocina (comandas en tiempo real) | ❌ | ✅ |
| Inventario FIFO | ❌ | ✅ |
| Push Notifications (FCM) | ❌ | ✅ |
| WebSockets en tiempo real | ❌ | ✅ |
| Reportes de staff y cocina | ❌ | ✅ |
| Escaneo QR de entrega (takeout) | ❌ | ✅ |

### Plataformas por Rol
| Rol | Plataforma | Plan |
|---|---|---|
| `saas_admin` | PWA CODEX (saas.foodify.mx) | N/A — interno |
| `restaurant_admin` | PWA admin + App Android (Premium) | Básico y Premium |
| `waiter` | App Android | Solo Premium |
| `chef` | App Android | Solo Premium |
| `cashier` | App Android | Solo Premium |

> **IMPORTANTE**: El rol `manager` fue **ELIMINADO** en v3.2. Sus funciones fueron absorbidas por `restaurant_admin`.

### Features Premium (PlanFeature enum)
```typescript
MOBILE_APP, KITCHEN_MODULE, INVENTORY_FIFO, PUSH_NOTIFICATIONS,
WEBSOCKETS, STAFF_REPORTS, WAITER_CHEF_ROLES, QR_SCAN_DELIVERY
```

---

## 3. ARQUITECTURA Y PIPELINE DE REQUEST

### Prefijo Global
`/api/v1` — excepto rutas públicas del menú (`/menu/:slug`) y aliases Android (`/api/staff`, `/api/platillos`, `/api/inventario`).

### Pipeline de Guards (orden de ejecución global — APP_GUARD)
1. **ThrottlerGuard** — Rate limiting (100 req/60s por defecto)
2. **JwtAuthGuard** — Valida JWT Bearer. Respeta `@Public()` (omite validación)
3. **RolesGuard** — Valida `@Roles(Role.X)`. Respeta `@Public()`
4. **PlanGuard** — Valida suscripción, estado y plan. Reglas:
   - `@Public()` → siempre permitido
   - `saas_admin` → siempre permitido
   - `suspended/cancelled` → 403 en todo
   - `past_due` → solo GET permitido (salvo `@AllowReadOnly`)
   - `waiter/chef/cashier` → 403 si plan NO es Premium
   - `@RequireFeature(X)` → 403 si feature no está en plan

### Middleware Global: snake_case → camelCase
El `main.ts` convierte recursivamente los bodies de snake_case a camelCase antes del ValidationPipe. Esto permite que la App Android envíe `prep_time_min` y el backend lo procese como `prepTimeMin`.

### Interceptor Global: TransformResponseInterceptor
Todas las respuestas se envuelven en `{ data, status: 200 }`. Además, DUPLICA cada key en snake_case para compatibilidad con Android (ej: `isActive` + `is_active`).

### Filtro Global: AllExceptionsFilter
Captura todas las excepciones y retorna `{ statusCode, timestamp, path, message }`.

### Decoradores Personalizados
- `@Public()` → Omite JWT (endpoints públicos)
- `@Roles(Role.X, ...)` → Restringe por rol
- `@RequireFeature(PlanFeature.X)` → Restringe por feature del plan
- `@AllowReadOnly()` → Permite GET en estado `past_due`
- `@CurrentUser()` → Extrae `req.user` del JWT
- `@RestaurantId()` → Extrae `req.user.restaurantId` del JWT

---

## 4. JWT PAYLOAD

```typescript
{
  sub: number,                // user.id
  email: string,
  role: string,               // saas_admin | restaurant_admin | waiter | chef | cashier
  restaurantId: number | null, // null para saas_admin
  planName: string,           // "Básico" | "Premium" | "N/A"
  subscriptionStatus: string  // trial | active | past_due | suspended | cancelled | "N/A"
}
```

---

## 5. MÓDULOS DEL SISTEMA (16 módulos)

---

### 5.1 AUTH (`/api/v1/auth`)
**Archivos**: `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`, `strategies/jwt.strategy.ts`, `entities/refresh-token.entity.ts`, `dto/auth.dto.ts`

**Entidades**:
- `refresh_tokens`: id, user_id (FK→users), token_hash, expires_at, revoked, created_at

**Endpoints**:
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/login` | @Public | Login con email+password. Valida plan. Retorna accessToken+refreshToken+role+planName |
| POST | `/refresh` | @Public | Rota refresh token → nuevo access_token |
| POST | `/logout` | JWT | Revoca refresh token |
| POST | `/forgot-password` | @Public | Envía OTP 6 dígitos al email (TODO: implementar Redis+email) |
| POST | `/verify-otp` | @Public | Valida OTP → retorna reset_token (TODO) |
| POST | `/reset-password` | @Public | Actualiza contraseña con reset_token (TODO) |
| GET | `/me` | JWT | Perfil completo del usuario autenticado |
| PATCH | `/fcm-token` | Premium: waiter/chef/cashier/admin | Actualiza token FCM para push Android |

**Lógica de Login**:
1. Busca usuario por email, valida `isActive`
2. Compara password con bcrypt
3. Consulta suscripción del restaurante
4. Bloquea si `suspended/cancelled`
5. Bloquea waiter/chef/cashier si plan NO es Premium
6. Genera accessToken (15min) y refreshToken (30d)
7. Guarda hash del refresh token en BD

---

### 5.2 USERS (`/api/v1/users`)
**Archivos**: `users.controller.ts`, `users.service.ts`, `users-compat.controller.ts`, `users.module.ts`, `entities/user.entity.ts`, `dto/user.dto.ts`

**Entidad `users`**:
| Campo | Tipo | Notas |
|---|---|---|
| id | PK unsigned | Auto-increment |
| restaurant_id | FK→restaurants | NULL para saas_admin |
| role | ENUM | saas_admin, restaurant_admin, waiter, chef, cashier |
| full_name | VARCHAR(120) | |
| email | VARCHAR(190) | UNIQUE |
| phone | VARCHAR(20) | Nullable |
| password_hash | VARCHAR(255) | select: false (no se retorna por defecto) |
| fcm_token | VARCHAR(255) | Solo Premium — token FCM Android |
| is_active | BOOLEAN | Default true. Soft delete = false |
| last_login_at | DATETIME | Nullable |
| created_at | DATETIME | Auto |

**Endpoints (restaurant_admin)**:
- `GET /users` — Lista empleados del restaurante
- `GET /users/:id` — Detalle
- `POST /users` — Crear empleado (hashea password con bcrypt 12 rounds)
- `PATCH /users/:id` — Actualizar
- `DELETE /users/:id` — Soft delete (isActive=false)

**Controlador de Compatibilidad Android** (`/api/staff`):
Alias para la App Android de Jorge. Mapeo de campos:
- `nombre/apellido` → `fullName`
- `rol` (Admin/Mesero/Cocina/Cajero) → `role` (restaurant_admin/waiter/chef/cashier)
- `activo` → `isActive`
- `contrasena` → `password`
- `fechaCreacion` → `createdAt` (formato dd/MM/yyyy)

---

### 5.3 RESTAURANTS (`/api/v1/restaurants`)
**Entidad `restaurants`**:
| Campo | Tipo | Notas |
|---|---|---|
| id | PK unsigned | |
| owner_id | FK→users | restaurant_admin dueño |
| name | VARCHAR(120) | |
| slug | VARCHAR(120) | UNIQUE — usado en URL pública `/menu/:slug` |
| logo_url | VARCHAR(255) | URL S3 |
| address | VARCHAR(255) | |
| timezone | VARCHAR(50) | Default: America/Monterrey |
| currency | CHAR(3) | Default: MXN |
| is_active | BOOLEAN | |
| dashboard_config | JSON | Toggles: show_sales, show_top_dishes, show_peak_hours, show_category_income, show_dishes_by_menu |
| created_at | DATETIME | |

**Endpoints (restaurant_admin)**:
- `GET /` — Lista restaurantes del owner
- `GET /:id` — Detalle
- `PUT /:id` — Actualizar nombre, dirección, timezone
- `PUT /:id/logo` — Subir logo a S3 (multipart, máx 2MB)
- `PATCH /:id/status` — Activar/suspender
- `PATCH /:id/settings` — Actualizar dashboard_config JSON
- `GET /:id/dashboard` — KPIs: ventas, pedidos activos, alertas inventario, top platillos

---

### 5.4 SAAS (`/api/v1/admin`)
**Solo `saas_admin`** — gestión interna de FOODIFY como negocio.

**Entidades**:

**`saas_plans`**: id, name, price_mxn, max_branches, max_menus, features (JSON array de strings), is_active, created_at

**`saas_subscriptions`**: id, restaurant_id (FK), plan_id (FK), status (ENUM: trial|active|past_due|suspended|cancelled), amount_mxn, billing_cycle_day, trial_ends_at, next_billing_at, current_period_end, cancelled_at, created_at, updated_at

**`payment_transactions`**: id, subscription (FK), amount, currency (MXN), status (ENUM: success|failed|refunded|dispute|pending), payment_method, gateway_ref (UNIQUE), paid_at, created_at

**Endpoints (saas_admin)**:
- `GET /dashboard/kpis` — KPIs globales: restaurantes activos, MRR, pagos vencidos
- `POST /restaurants/register` — **Alta atómica**: crea restaurante + admin + suscripción trial (30d) en transacción
- `GET /restaurants` — Lista con filtros (plan, status, search, paginación)
- `GET /restaurants/:id` — Detalle + métricas
- `GET /restaurants/:id/stats` — Platillos vendidos por menú
- `GET /restaurants/:id/menus` — Menús con horarios
- `GET /restaurants/:id/dishes/sold` — Platillos vendidos con %
- `PATCH /restaurants/:id/status` — Activar/suspender (cascada a suscripción)
- `GET /subscriptions` — Todas con estado de pago calculado dinámicamente
- `GET /subscriptions/:id` — Detalle + historial de pagos
- `PATCH /subscriptions/:id/status` — Cambiar estado (cascada a restaurant.is_active)
- `PATCH /subscriptions/:id/plan` — Upgrade/downgrade de plan
- `POST /subscriptions/:id/payment` — Registrar pago manual → status=active, next_billing_at+1mes
- `POST /subscriptions/:id/reminder` — Enviar recordatorio de pago por email
- `GET /payments/report` — Reporte CSV/JSON de pagos

**Flujo de Alta de Cliente**:
1. `POST /admin/restaurants/register` → crea restaurante + admin + trial
2. Cliente paga externamente
3. `POST /admin/subscriptions/:id/payment` → status=active
4. Si necesita Premium: `PATCH /admin/subscriptions/:id/plan`

---

### 5.5 PAYMENTS (`/api/v1/payments`)
**Webhooks para pasarelas de pago** (endpoints @Public):
- `POST /stripe/webhook` — Recibe webhooks de Stripe (TODO: validar firma)
- `POST /conekta/webhook` — Recibe webhooks de Conekta (TODO: procesar)

---

### 5.6 MENUS (`/api/v1/menus`)
**Entidad `menus`**: id, restaurant_id (FK), name, description, is_active, schedule (JSON: `{days:[1-5], start:"12:00", end:"16:00"}`), sort_order, allow_outside_schedule (default true: acepta pedidos fuera del horario), created_at. Relación: `OneToMany → MenuCategory`.

**Endpoints (restaurant_admin)**:
- `GET /menus` — Lista menús (relations: categories, order: sortOrder ASC)
- `GET /menus/:id` — Detalle con categorías y platillos
- `POST /menus` — Crear menú
- `PUT /menus/:id` — Actualizar
- `PATCH /menus/:id/status` — Toggle isActive
- `DELETE /menus/:id` — Soft delete (isActive=false)
- `GET /menus/:id/categories` — Categorías del menú

---

### 5.7 CATEGORIES (`/api/v1/menus/:menuId/categories`)
**Entidad `menu_categories`**: id, menu_id (FK→menus CASCADE), name, description, icon, schedule (JSON), sort_order, is_active. Relación: `OneToMany → Dish`.

**Endpoints (restaurant_admin)**:
- CRUD estándar + `PATCH /:id/sort` para reordenar

---

### 5.8 DISHES (`/api/v1/dishes`)
**Entidad `dishes`**:
| Campo | Tipo | Notas |
|---|---|---|
| id | PK unsigned | |
| restaurant_id | FK→restaurants | |
| category_id | FK→menu_categories | Nullable, SET NULL on delete |
| name | VARCHAR(120) | |
| description | TEXT | Nullable |
| price | DECIMAL(10,2) | |
| cost_est | DECIMAL(10,2) | Costo estimado, default 0 |
| margin_pct | DECIMAL(5,2) | **GENERATED STORED**: `((price - cost_est) / price) * 100` |
| prep_time_min | TINYINT | Default 15 |
| is_available | BOOLEAN | Default true, auto-toggle por inventario FIFO |
| images | JSON | Array de URLs S3 (máx 3) |
| allergens | JSON | Array de strings |
| sort_order | SMALLINT | |
| deleted_at | DATETIME | Nullable — soft delete |
| created_at | DATETIME | |

**Endpoints (restaurant_admin)**:
- `GET /dishes` — Filtros: categoryId, available, search
- `GET /dishes/:id` — Detalle con categoría
- `POST /dishes` — Crear
- `PUT /dishes/:id` — Actualizar
- `PATCH /dishes/:id/availability` — Toggle manual disponibilidad
- `DELETE /dishes/:id` — Soft delete (set deleted_at)
- `PUT /dishes/:id/images` — Subir hasta 3 imágenes (multipart)

**Controlador de Compatibilidad Android** (`/api/platillos`):
Alias para Jorge. Mapeo: nombre→name, categoria→category.name, precio→price, tiempo→prepTimeMin, descripcion→description, imagenUri→images[0], disponible→isAvailable.

---

### 5.9 RECIPES (`/api/v1/dishes/:id/recipe`)
**Entidades**:

**`recipes`**: id, dish_id (FK→dishes UNIQUE OneToOne), prep_time_min, servings, steps (JSON: `[{order, description}]`), notes, created_at, updated_at. Relación: `OneToMany → RecipeIngredient`.

**`recipe_ingredients`**: id, recipe_id (FK→recipes CASCADE), item_id (FK→inventory_items nullable SET NULL — vincula con FIFO), name, quantity, unit, is_optional.

**Endpoints**:
- `GET /dishes/:id/recipe` — chef+admin: Receta con ingredientes
- `PUT /dishes/:id/recipe` — admin: Upsert receta (borra ingredientes previos y recrea)
- `POST /dishes/:id/recipe/ingredients` — admin: Agregar ingrediente
- `PUT /dishes/:id/recipe/ingredients/:iid` — admin: Actualizar ingrediente
- `DELETE /dishes/:id/recipe/ingredients/:iid` — admin: Eliminar ingrediente

---

### 5.10 INVENTORY (`/api/v1/inventory`) — SOLO PREMIUM
**Entidades**:

**`inventory_items`**: id, restaurant_id (FK), name, unit (Kg/L/Pz), min_stock, current_stock, category (Carnes/Lácteos/etc), image_url, created_at. Relaciones: `OneToMany → InventoryLot`, `OneToMany → InventoryAlert`.

**`inventory_lots`** (sistema FIFO — el lote más antiguo se consume primero):
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| item_id | FK→inventory_items CASCADE | |
| lot_number | VARCHAR(50) | Nullable |
| quantity | DECIMAL(10,3) | Cantidad inicial |
| remaining | DECIMAL(10,3) | Cantidad disponible (decrece con pedidos) |
| unit_cost | DECIMAL(10,4) | |
| supplier | VARCHAR(120) | |
| entry_date | DATE | **Clave FIFO**: ASC = más antiguo primero |
| expiry_date | DATE | Nullable. Alerta automática ≤7 días |
| status | ENUM | available, low, critical, expired, depleted |
| created_at | DATETIME | |

**`inventory_movements`**: id, lot_id (FK), order_id (nullable, solo para 'sale'), type (ENUM: sale|waste|adjustment|entry), quantity, notes, created_by_id (FK→users nullable), created_at.

**`inventory_alerts`**: id, item_id (FK), type (ENUM: low_stock|expiring_soon|expired|out_of_stock), message, is_resolved, created_at.

**Endpoints (restaurant_admin, RequireFeature: INVENTORY_FIFO)**:
- `GET /items` — Lista insumos con stock y alertas
- `POST /items` — Nuevo insumo
- `GET /items/:id` — Detalle + lotes + movimientos
- `PUT /items/:id` — Actualizar insumo
- `GET /lots` — Lotes con filtros (itemId, status, expiringSoon)
- `POST /lots` — **Nueva entrada de mercancía**: crea lote, actualiza stock global, registra movimiento 'entry'. Auto-crea insumo si no existe (UX móvil)
- `PUT /lots/:id` — Editar lote
- `DELETE /lots/:id` — Baja por merma: movimiento 'waste', remaining=0, status=depleted
- `GET /movements` — Historial filtrable
- `POST /adjustments` — Ajuste manual (±quantity). Si stock ≤ minStock → alerta low_stock
- `GET /alerts` — Alertas activas (is_resolved=false)
- `PATCH /alerts/:id/resolve` — Resolver alerta
- `POST /refresh-statuses` — Recalcula estados de lotes por caducidad

**Controlador de Compatibilidad Android** (`/api/inventario`):
- `GET /` → alias de `GET /inventory/lots`
- `POST /` → alias de `POST /inventory/lots`
- `PATCH /:id` → alias de `POST /inventory/adjustments`

**Trigger MySQL FIFO** (`after_order_delivered`): Cuando una orden cambia a status=delivered, el trigger descuenta automáticamente los ingredientes de las recetas del inventario, consumiendo primero el lote con `entry_date` más antiguo.

---

### 5.11 TABLES (`/api/v1/tables`)
**Entidad `tables`**: id, restaurant_id (FK), number (SMALLINT), capacity (TINYINT default 4), qr_code_url (URL auto-generada: `https://menu.foodify.mx/mesa/{rid}-{number}`), status (ENUM: available|occupied|reserved|cleaning).

**Endpoints**:
- `GET /tables` — admin+waiter: Lista mesas ordenadas por number
- `GET /tables/:id` — admin+waiter: Detalle
- `POST /tables` — admin: Crear mesa (genera QR URL)
- `PUT /tables/:id` — admin: Actualizar
- `PATCH /tables/:id/status` — admin+waiter: Cambiar estado
- `DELETE /tables/:id` — admin: Eliminar (hard delete)

---

### 5.12 ORDERS (`/api/v1/orders`)
**Entidad `orders`** (campos inferidos del servicio y DTOs):
- id, restaurant_id, table_id (nullable), waiter_id (nullable), order_number (folio 0001-9999), type (ENUM: dine_in|takeout), status (ENUM: pending|confirmed|preparing|ready|delivered|cancelled), kitchen_status (ENUM: pending|preparing|ready|delivered), qr_code (base64 data URL, solo takeout), customer_name, customer_phone, notes, subtotal, tax_amount (16% IVA), total, delivered_at, cancelled_at, cancel_reason, created_at. Relaciones: `OneToMany → OrderItem`, `ManyToOne → Table`, `ManyToOne → User(waiter)`.

**Entidad `order_items`**: id, order_id (FK CASCADE), dish_id (FK), quantity, unit_price, subtotal (GENERATED: quantity*unit_price), special_notes, status (ENUM: pending|preparing|ready|served), started_at, ready_at, created_at.

**Máquina de Estados de Orden**:
```
pending → confirmed → preparing → ready → delivered
    ↓         ↓           ↓
  cancelled cancelled   cancelled
```
No hay retrocesos. `delivered` y `cancelled` son estados finales.

**Máquina de Estados de Ítem (cocina)**:
```
pending → preparing → ready → served
```

**Endpoints**:
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/` | @Public (takeout) o JWT waiter (dine_in) | Crear orden. Takeout genera QR. IVA 16% automático |
| GET | `/` | admin/waiter/cashier | Filtros: status, kitchenStatus, tableId, waiterId, dateFrom, dateTo |
| GET | `/active` | admin/waiter/cashier | Pedidos activos (pending+confirmed+preparing+ready) |
| GET | `/:id` | admin/waiter/cashier | Detalle completo con ítems, platillo, mesa, mesero |
| PATCH | `/:id/status` | admin/waiter | Cambiar estado (validación de transiciones) |
| PATCH | `/:id/kitchen-status` | chef/admin, Premium | Cambiar estado cocina |
| PATCH | `/:id/scan-qr` | waiter/cashier, Premium | Escanear QR takeout → delivered |
| POST | `/:id/items` | waiter/admin | Agregar ítem a orden activa |
| PATCH | `/:id/items/:iid` | waiter/admin | Modificar cantidad/notas de ítem |
| DELETE | `/:id/items/:iid` | waiter/admin | Eliminar ítem |
| PATCH | `/:id/cancel` | admin/waiter | Cancelar con motivo |

**Dos orígenes de creación**:
1. **PWA Pública (sin JWT)**: type=takeout, requiere customerName+customerPhone, genera QR
2. **App Android (JWT waiter)**: type=dine_in, requiere tableId

---

### 5.13 KITCHEN (`/api/v1/kitchen`) — SOLO PREMIUM
**Entidad `kitchen_sessions`**: id, chef (FK→users), restaurant_id, started_at, ended_at (NULL = turno activo).

**Endpoints (chef/admin, RequireFeature: KITCHEN_MODULE)**:
- `GET /orders` — Comandas activas (kitchen_status: pending/preparing/ready), ordenadas por createdAt ASC
- `GET /orders/:id` — Detalle de comanda con ítems y notas
- `PATCH /orders/:id/status` — Cambiar kitchen_status (pending→preparing→ready→delivered, sin retrocesos)
- `PATCH /order-items/:id/status` — Estado individual de ítem (pending→preparing→ready→served). Al marcar preparing: set started_at. Al marcar ready: set ready_at. **Si TODOS los ítems = ready → kitchen_status = ready automático + emite order:ready al WS**
- `GET /dishes` — Platillos con receta resumida
- `GET /dishes/:id/recipe` — Receta completa
- `POST /recipes` — admin: Crear receta
- `PUT /recipes/:id` — admin: Actualizar receta
- `GET /stats` — Stats del turno: sesión activa, comandas completadas
- `POST /sessions/start` — Iniciar turno (valida no duplicados)
- `PATCH /sessions/:id/end` — Cerrar turno (set ended_at)

---

### 5.14 PUBLIC-MENU (`/menu/:slug`) — SIN JWT
**Endpoints (@Public, sin prefijo /api/v1)**:
- `GET /menu/:slug` — Menú público. Query params: `table=N`, `mode=dine_in|takeout`
  - Retorna: restaurante (id, name, logoUrl, slug, timezone, currency), menus activos con:
    - `isActiveNow`: calculado según schedule y timezone
    - `isOrderableNow`: true si allowOutsideSchedule o isActiveNow
    - `availabilityNote`: texto informativo si no está activo
    - `cartEnabled`: true solo en mode=takeout
  - Filtra: solo menús activos, categorías activas, platillos no eliminados y disponibles
- `GET /menu/:slug/order/:folio` — Consulta orden Para Llevar. SIN estados de cocina (por diseño). Retorna: folio, customerName, qrCode, total, items (dishName, quantity, unitPrice, specialNotes), received: true

**Modos**:
- `dine_in`: Solo visualización, sin carrito. El waiter crea la orden desde App Android
- `takeout`: Con carrito habilitado. El comensal crea su orden (POST /api/v1/orders @Public)

---

### 5.15 REPORTS (`/api/v1/reports`)
**Endpoints (restaurant_admin)**:

*Plan Básico y Premium*:
- `GET /sales?period=today|week|month|quarter|year|custom&start=&end=`
- `GET /dishes/top?period=&limit=10`
- `GET /peak-hours?period=`
- `GET /category-income?period=`
- `GET /dishes/sold?menuId=&period=&start=&end=`
- `GET /menus/summary?period=`
- `GET /export?type=sales|dishes|inventory&period=&format=csv|xlsx`

*Solo Premium*:
- `GET /inventory/cost?period=` — RequireFeature: INVENTORY_FIFO
- `GET /inventory/waste?period=` — RequireFeature: INVENTORY_FIFO
- `GET /staff?period=&userId=` — RequireFeature: STAFF_REPORTS
- `GET /kitchen/performance?period=` — RequireFeature: KITCHEN_MODULE

---

### 5.16 NOTIFICATIONS
**Solo Premium — Push FCM a dispositivos Android**. Sin endpoints HTTP. Es un servicio inyectable:
- `sendPush(fcmToken, title, body, data)` — Envía push genérico
- `notifyOrderReady(fcmToken, orderId, tableNumber)` — "🍽 Pedido listo para entregar"
- `notifyLowStock(fcmToken, itemName, currentStock, unit)` — "⚠️ Stock bajo"
- `notifyExpiringSoon(fcmToken, itemName, expiryDate)` — "📅 Insumo próximo a caducar"

> **TODO**: Inicializar Firebase Admin SDK con las credenciales de .env

---

## 6. WEBSOCKETS (Socket.io)

### Namespace `/restaurant`
**Receptores**: waiter, restaurant_admin, cashier  
**Room**: `restaurant_{restaurantId}`  
**Autenticación**: JWT en handshake

**Eventos Server → Client**:
- `order:new_notification` — Nueva orden recibida
- `order:status` — Cambio de estado de orden
- `order:ready` — Comanda lista (+ push FCM al waiter)
- `order:delivered` — Pedido entregado (dispara trigger FIFO)
- `inventory:alert` — Insumo con stock bajo
- `dish:unavailable` — Platillo auto-desactivado por stock 0

### Namespace `/kitchen`
**Receptores**: chef, restaurant_admin  
**Room**: `kitchen_{restaurantId}`  
**Autenticación**: JWT en handshake (solo chef/admin)

**Eventos Server → Chef**:
- `order:new` — Nueva comanda
- `order:cancelled` — Comanda cancelada
- `order:ready` — Toda la comanda lista

**Eventos Chef → Server**:
- `order:item:start` — Chef inicia preparación de ítem
- `order:item:ready` — Chef marca ítem como listo

---

## 7. DIAGRAMA DE ENTIDADES (RESUMEN)

```
users ──────┐
            ├── restaurants ──── menus ──── menu_categories ──── dishes
            │       │                                              │
            │       ├── tables                              recipes ── recipe_ingredients
            │       │                                              │
            │       ├── orders ──── order_items ──── dishes    inventory_items
            │       │                                    │         │
            │       ├── inventory_items ── inventory_lots ── inventory_movements
            │       │                      │
            │       │               inventory_alerts
            │       │
            │       └── kitchen_sessions
            │
saas_plans ─┴── saas_subscriptions ──── payment_transactions
                        │
                   restaurants

refresh_tokens ──── users
```

---

## 8. COMANDOS NPM

```bash
npm run start:dev          # Desarrollo con hot reload
npm run build              # Build producción
npm run start              # Ejecutar dist/main.js
npm run migration:run      # Ejecutar migraciones TypeORM
npm run migration:revert   # Revertir última migración
npm run seed               # Ejecutar seeds
npm run seed:android       # Crear usuarios de prueba Android
npm run lint               # ESLint fix
npm run format             # Prettier
```

---

## 9. FLUJOS DE NEGOCIO CLAVE

### Flujo de Orden Para Llevar (Takeout)
1. Comensal abre `/menu/:slug?mode=takeout`
2. Agrega platillos al carrito
3. `POST /api/v1/orders` (@Public, sin JWT) con type=takeout, customerName, customerPhone, items
4. Backend genera QR único (base64), calcula subtotal + 16% IVA
5. Comensal recibe folio y QR
6. **Plan Básico**: admin confirma entrega desde PWA → `PATCH /orders/:id/status {status: delivered}`
7. **Plan Premium**: waiter/cashier escanea QR → `PATCH /orders/:id/scan-qr`
8. Al marcar delivered → trigger FIFO descuenta inventario

### Flujo de Orden en Restaurante (Dine-in) — Solo Premium
1. Waiter desde App Android: `POST /api/v1/orders` (JWT) con type=dine_in, tableId, items
2. WS emite `order:new_notification` al namespace /restaurant y `order:new` al /kitchen
3. Chef ve comanda en pantalla cocina
4. Chef marca ítems: `PATCH /kitchen/order-items/:id/status` (pending→preparing→ready)
5. Cuando TODOS ready → kitchen_status=ready automático + WS `order:ready` + push FCM al waiter
6. Waiter entrega + cambia status a delivered
7. Trigger FIFO descuenta inventario

### Flujo de Inventario FIFO
1. Admin registra entrada: `POST /inventory/lots` → lote nuevo, stock actualizado, movimiento 'entry'
2. Al entregar orden: trigger MySQL descuenta del lote más antiguo (entry_date ASC)
3. Si stock ≤ minStock → alerta `low_stock` + push FCM al admin
4. Si remaining=0 en un lote → status=depleted
5. Si stock global de un insumo llega a 0 → platillos asociados se desactivan automáticamente (dish:unavailable)
6. Refresh periódico: `POST /inventory/refresh-statuses` verifica caducidades → alertas expiring_soon/expired

---

## 10. NOTAS TÉCNICAS IMPORTANTES

1. **Multi-tenancy**: TODO se filtra por `restaurant_id` extraído del JWT. Nunca se mezclan datos entre restaurantes.
2. **Soft deletes**: Users (isActive=false), Menus (isActive=false), Dishes (deleted_at), Categories (isActive=false). No se borran registros de BD.
3. **Compatibilidad Android**: Middleware snake_case→camelCase en entrada. Interceptor duplica keys en snake_case en salida. Controladores `-compat` para rutas alias.
4. **Columnas generadas MySQL**: `dishes.margin_pct` y `order_items.subtotal` son STORED GENERATED, no se pueden insertar directamente.
5. **synchronize: false**: Las migraciones son obligatorias. Nunca se sincroniza automáticamente el esquema.
6. **Redis adapter**: Socket.io usa Redis para escalar horizontalmente. Si Redis no está disponible, cae a adapter en memoria con warning.
7. **IVA**: Se calcula como 16% sobre subtotal en cada orden.
8. **Folio de orden**: Secuencial 0001-9999, reinicia al llegar a 9999.
