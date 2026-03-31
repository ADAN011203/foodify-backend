# 📱 Foodify Android — Referencia de API v3.2

**Responsable:** Jorge (Equipo CODEX)
**Tecnología:** Kotlin / Android Studio / Retrofit + OkHttp
**Plan requerido:** ⭐ Premium (los roles `waiter`, `chef`, `cashier` no pueden login en Plan Básico)

---

## 🔌 Conexión al Backend

| Entorno | URL Base |
|---------|---------|
| Emulador Android Studio | `http://10.0.2.2:3000/api/v1` |
| Celular físico por WiFi | `http://<TU_IP_LOCAL>:3000/api/v1` (ej: `192.168.1.75`) |

> ⚠️ **Nunca uses `localhost`** desde el emulador. El emulador lo interpreta como el propio teléfono virtual.

---

## 🔐 Módulo: Autenticación — `/api/v1/auth`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/auth/login` | Login con email + password | 🔓 No |
| `POST` | `/auth/refresh` | Renueva el accessToken | 🔓 No |
| `POST` | `/auth/logout` | Cierra sesión | JWT |
| `GET`  | `/auth/me` | Perfil del usuario | JWT |
| `PATCH`| `/auth/fcm-token` | Registrar token FCM para push notifications | JWT ⭐ |

### Body: `POST /auth/login`
```json
{ "email": "maria.garcia@foodify.com", "password": "cualquier6" }
```

### Respuesta de login
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "role": "waiter",
  "planName": "Premium",
  "subscriptionStatus": "trial"
}
```

### Interceptor Retrofit (agregar en cada llamada)
```kotlin
.addHeader("Authorization", "Bearer $accessToken")
```

### Body: `PATCH /auth/fcm-token`
```json
{ "fcmToken": "dYoKSfE8QsOhABCxyz..." }
```

### Credenciales de desarrollo

| Email | Contraseña | Rol | Pantalla |
|-------|-----------|-----|---------|
| `admin@foodify.com` | `cualquier6` | `restaurant_admin` | Admin Dashboard |
| `maria.garcia@foodify.com` | `cualquier6` | `waiter` | Pantalla Mesero |
| `chef@foodify.com` | `cualquier6` | `chef` | Pantalla Cocina |

---

## 🍽️ Módulo: Menú — Lectura para el Mesero

> El mesero usa este módulo para consultar el catálogo de platillos cuando levanta un pedido.
> No crea ni edita menús (eso es del Admin en la PWA).

### 1. Obtener menús activos

```
GET /api/v1/menus
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "name": "Menú del Día",
    "isActive": true,
    "allowOutsideSchedule": true,
    "categories": [
      { "id": 3, "name": "Entradas", "menuId": 1 },
      { "id": 4, "name": "Platillos Fuertes", "menuId": 1 }
    ]
  }
]
```

### 2. Obtener platillos (catálogo para tomar pedido)

```
GET /api/v1/dishes
GET /api/v1/dishes?categoryId=3
GET /api/v1/dishes?available=true&search=taco
Authorization: Bearer <token>
```

**Respuesta de cada platillo:**
```json
{
  "id": 5,
  "name": "Tacos de Birria",
  "price": 75.00,
  "prepTimeMin": 15,
  "description": "3 tacos con consomé",
  "isAvailable": true,
  "images": ["https://s3.amazonaws.com/..."],
  "categoryId": 3,
  "category": { "id": 3, "name": "Entradas" }
}
```

### Diagrama de flujo — Levantar pedido
```
[Mesero abre app]
     ↓
GET /api/v1/menus          ← Lista menús activos
     ↓
GET /api/v1/dishes         ← Catálogo de platillos
     ↓
[Selecciona mesa + platillos]
     ↓
POST /api/v1/orders        ← Crea el pedido
     ↓
[Cocina recibe en su pantalla]
```

---

## 🪑 Módulo: Mesas — `/api/v1/tables`

**Roles:** `restaurant_admin`, `waiter`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/tables` | Ver todas las mesas y su estado |
| `GET`    | `/tables/:id` | Detalle de una mesa |
| `PATCH`  | `/tables/:id/status` | Cambiar estado de mesa |

### Body: `PATCH /tables/:id/status`
```json
{ "status": "occupied" }
```

### Estados de mesa
| Valor | Mostrar como |
|-------|-------------|
| `available` | 🟢 Disponible |
| `occupied`  | 🔴 Ocupada |
| `reserved`  | 🟡 Reservada |
| `cleaning`  | 🔵 Limpieza |

---

## 📋 Módulo: Pedidos — `/api/v1/orders`

**Roles:** `waiter`, `restaurant_admin` (gestión de ítems), `cashier` (lectura y cierre)

### Crear pedido (waiter — dine_in)

```
POST /api/v1/orders
Authorization: Bearer <token_waiter>
```

```json
{
  "type": "dine_in",
  "tableId": 5,
  "notes": "Alergia a nueces en mesa 5",
  "items": [
    { "dishId": 3, "quantity": 2, "specialNotes": "Sin cebolla" },
    { "dishId": 7, "quantity": 1 }
  ]
}
```

### Consultar pedidos activos

```
GET /api/v1/orders/active
Authorization: Bearer <token>
```

### Ver detalle de un pedido

```
GET /api/v1/orders/:id
Authorization: Bearer <token>
```

### Agregar ítem a pedido activo

```
POST /api/v1/orders/:id/items
```
```json
{ "dishId": 10, "quantity": 1, "specialNotes": "Término medio" }
```

### Modificar ítem

```
PATCH /api/v1/orders/:id/items/:iid
```
```json
{ "quantity": 3, "specialNotes": "Extra picante" }
```

### Eliminar ítem

```
DELETE /api/v1/orders/:id/items/:iid
```

### Cambiar estado del pedido

```
PATCH /api/v1/orders/:id/status
```
```json
{ "status": "delivered" }
```

### Cancelar pedido

```
PATCH /api/v1/orders/:id/cancel
```
```json
{ "cancelReason": "Cliente cambió de opinión" }
```

### Escanear QR (Para Llevar) ⭐ Premium

```
PATCH /api/v1/orders/:id/scan-qr
Roles: waiter, cashier
```

### Estados del pedido
| Valor | Mostrar como |
|-------|-------------|
| `pending`   | 🕐 Nuevo |
| `confirmed` | ✅ Confirmado |
| `preparing` | 👨‍🍳 Preparando |
| `ready`     | 🔔 Listo |
| `delivered` | 📦 Entregado |
| `cancelled` | ❌ Cancelado |

---

## 👨‍🍳 Módulo: Cocina — `/api/v1/kitchen` ⭐ Premium

**Roles:** `chef`, `restaurant_admin`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/kitchen/orders` | Comandas activas del turno (ordenadas por antigüedad) |
| `GET`    | `/kitchen/orders/:id` | Detalle de comanda con ítems y notas |
| `PATCH`  | `/kitchen/orders/:id/status` | Cambiar estado de comanda |
| `PATCH`  | `/kitchen/order-items/:id/status` | Cambiar estado de ítem individual |
| `GET`    | `/kitchen/dishes` | Platillos con receta resumida |
| `GET`    | `/kitchen/dishes/:id/recipe` | Receta completa con pasos |
| `GET`    | `/kitchen/stats` | Stats del turno actual |
| `POST`   | `/kitchen/sessions/start` | Iniciar turno |
| `PATCH`  | `/kitchen/sessions/:id/end` | Cerrar turno |

### Body: `PATCH /kitchen/orders/:id/status`
```json
{ "status": "preparing" }
```

### Body: `PATCH /kitchen/order-items/:id/status`
```json
{ "status": "ready" }
```

### Flujo del chef
```
POST /kitchen/sessions/start    ← Al iniciar turno
     ↓
GET /kitchen/orders              ← Ver comandas activas (polling cada 5s o WebSocket)
     ↓
PATCH /kitchen/order-items/:id/status  { status: "preparing" }
     ↓
PATCH /kitchen/order-items/:id/status  { status: "ready" }
     ↓  (si todos los ítems = ready → kitchen_status = ready automático)
     ↓  (push FCM notifica al mesero)
PATCH /kitchen/sessions/:id/end  ← Al cerrar turno
```

### Lógica de colores de urgencia (implementar en la app)
```kotlin
// pending > 20 min → borde ROJO
// preparing > 30 min → borde NARANJA
val minutesElapsed = ChronoUnit.MINUTES.between(
    LocalDateTime.parse(order.createdAt),
    LocalDateTime.now()
)
```

---

## 📦 Módulo: Inventario — `/api/v1/inventory` ⭐ Premium

**Rol:** `restaurant_admin`

> Ver el archivo **`README_INVENTARIO_ANDROID_PROMPT.md`** para el prompt completo
> de implementación de este módulo en la app Android.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/inventory/items` | Lista insumos con stock actual y alertas |
| `POST`   | `/inventory/items` | Registrar nuevo insumo |
| `GET`    | `/inventory/items/:id` | Detalle + lotes + movimientos |
| `PUT`    | `/inventory/items/:id` | Actualizar insumo |
| `GET`    | `/inventory/lots` | Lotes activos (filtros: `itemId`, `status`, `expiringSoon`) |
| `POST`   | `/inventory/lots` | Nueva entrada de mercancía |
| `PUT`    | `/inventory/lots/:id` | Editar lote |
| `DELETE` | `/inventory/lots/:id` | Dar de baja por merma |
| `GET`    | `/inventory/movements` | Historial de movimientos |
| `POST`   | `/inventory/adjustments` | Ajuste manual de stock |
| `GET`    | `/inventory/alerts` | Alertas activas (`alertFlag=true`) |
| `PATCH`  | `/inventory/alerts/:id/resolve` | Marcar alerta como resuelta |

---

## 🌐 WebSockets — Tiempo real

**Namespace:** `/restaurant`
**URL:** `ws://10.0.2.2:3000/restaurant`

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `order:new` | Server → App | Nueva orden creada |
| `order:ready` | Server → App | Orden lista (notifica al mesero) |
| `order:status` | Server → App | Cambio de estado genérico |
| `inventory:alert` | Server → App | Alerta de stock bajo |

### Conexión en Kotlin (Socket.IO)
```kotlin
val socket = IO.socket("http://10.0.2.2:3000/restaurant", opts)
socket.on("order:ready") { args ->
    val orderId = args[0] as Int
    // Mostrar notificación al mesero
}
socket.connect()
```

---

## 🔄 Flujo completo por rol

### 👔 Admin (`restaurant_admin`)
```
Login → Dashboard KPIs → Gestión de Mesas → Ver Pedidos activos
     → Ver Inventario → Alertas de stock
```

### 🙋 Mesero (`waiter`)
```
Login → Ver Mesas → Seleccionar Mesa → Consultar Menú/Platillos
     → Crear Pedido → Agregar/quitar ítems → Marcar entregado
     → WebSocket: recibe "order:ready" → notifica al cliente
```

### 👨‍🍳 Chef (`chef`)
```
Login → Iniciar Turno (POST /kitchen/sessions/start)
     → Ver Comandas activas (polling o WS)
     → Marcar ítems: preparing → ready
     → Ver stats del turno
     → Cerrar Turno (PATCH /kitchen/sessions/:id/end)
```
