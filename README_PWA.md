# 🖥️ Foodify PWA — Referencia de API v3.2

**Plataforma:** Dashboard web del restaurante (`saas.foodify.mx`)
**Stack sugerido:** Next.js / React + Axios / TanStack Query
**Base URL desarrollo:** `http://localhost:3000/api/v1`
**Base URL producción:** `https://api.foodify.mx/api/v1`

> Todos los endpoints (excepto los marcados `🔓 Público`) requieren el header:
> ```
> Authorization: Bearer <accessToken>
> ```

---

## 🔐 Módulo: Autenticación — `/api/v1/auth`

| Método | Ruta | Descripción | Auth | Plan |
|--------|------|-------------|------|------|
| `POST` | `/auth/login` | 🔓 Login con email + password | No | Todos |
| `POST` | `/auth/refresh` | 🔓 Rota el refresh token | No | Todos |
| `POST` | `/auth/logout` | Invalida sesión | JWT | Todos |
| `GET`  | `/auth/me` | Perfil del usuario autenticado | JWT | Todos |
| `POST` | `/auth/forgot-password` | 🔓 Envía OTP al correo | No | Todos |
| `POST` | `/auth/verify-otp` | 🔓 Valida OTP → reset token | No | Todos |
| `POST` | `/auth/reset-password` | 🔓 Actualiza contraseña | No | Todos |

### Body: `POST /auth/login`
```json
{
  "email": "admin@foodify.com",
  "password": "cualquier6"
}
```

### Respuesta de login
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "role": "restaurant_admin",
  "planName": "Premium",
  "subscriptionStatus": "trial"
}
```

> **Nota:** El `accessToken` expira en **15 minutos**. Usa `POST /auth/refresh` con el `refreshToken` para renovarlo sin pedir login al usuario.

---

## 👥 Módulo: Staff / Usuarios — `/api/v1/users`

**Rol requerido:** `restaurant_admin` | **Plan:** Básico y Premium

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/users` | Lista todo el staff del restaurante |
| `GET`    | `/users/:id` | Detalle de un empleado |
| `POST`   | `/users` | Crear nuevo empleado |
| `PATCH`  | `/users/:id` | Actualizar datos del empleado |
| `DELETE` | `/users/:id` | Desactivar empleado |

### Body: `POST /users`
```json
{
  "fullName": "Carlos Reyes",
  "email": "carlos@mi-restaurante.com",
  "password": "segura123",
  "role": "waiter",
  "phone": "81-1234-5678"
}
```

> **Roles válidos:** `restaurant_admin` | `waiter` | `chef` | `cashier`
> `waiter`, `chef` y `cashier` solo pueden iniciar sesión si el plan es **Premium**.

---

## 🍽️ Módulo: Menús — `/api/v1/menus`

**Rol requerido:** `restaurant_admin` | **Plan:** Básico y Premium

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/menus` | Lista todos los menús del restaurante |
| `GET`    | `/menus/:id` | Detalle de un menú |
| `POST`   | `/menus` | Crear nuevo menú |
| `PUT`    | `/menus/:id` | Actualizar menú completo |
| `PATCH`  | `/menus/:id/status` | Activar / desactivar menú |
| `DELETE` | `/menus/:id` | Eliminar menú |
| `GET`    | `/menus/:id/categories` | Categorías de un menú |

### Body: `POST /menus`
```json
{
  "name": "Menú del Día",
  "description": "Disponible de lunes a viernes",
  "isActive": true,
  "allowOutsideSchedule": false,
  "schedule": {
    "monday": { "open": "08:00", "close": "16:00" },
    "tuesday": { "open": "08:00", "close": "16:00" }
  }
}
```

---

## 📁 Módulo: Categorías — `/api/v1/menus/:menuId/categories`

**Rol requerido:** `restaurant_admin` | **Plan:** Básico y Premium

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/menus/:menuId/categories` | Categorías de un menú |
| `GET`    | `/menus/:menuId/categories/:id` | Detalle de categoría |
| `POST`   | `/menus/:menuId/categories` | Crear categoría |
| `PUT`    | `/menus/:menuId/categories/:id` | Actualizar categoría |
| `PATCH`  | `/menus/:menuId/categories/:id/sort` | Reordenar categoría |
| `DELETE` | `/menus/:menuId/categories/:id` | Eliminar categoría |

### Body: `POST /menus/1/categories`
```json
{
  "name": "Entradas",
  "description": "Para compartir",
  "sortOrder": 1
}
```

---

## 🥘 Módulo: Platillos — `/api/v1/dishes`

**Rol requerido:** `restaurant_admin` | **Plan:** Básico y Premium

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/dishes` | Lista platillos (filtros: `categoryId`, `available`, `search`) |
| `GET`    | `/dishes/:id` | Detalle con receta |
| `POST`   | `/dishes` | Crear platillo |
| `PUT`    | `/dishes/:id` | Actualizar platillo |
| `PATCH`  | `/dishes/:id/availability` | Toggle disponibilidad (manual) |
| `DELETE` | `/dishes/:id` | Soft delete |
| `PUT`    | `/dishes/:id/images` | Subir hasta 3 imágenes (multipart/form-data) |

### Body: `POST /dishes`
```json
{
  "name": "Tacos de Birria",
  "price": 75.00,
  "prepTimeMin": 15,
  "description": "3 tacos con consomé",
  "categoryId": 2,
  "allergens": ["gluten", "lácteos"]
}
```

### Query params: `GET /dishes`
```
GET /api/v1/dishes?categoryId=2&available=true&search=taco
```

---

## 🪑 Módulo: Mesas — `/api/v1/tables`

**Rol requerido:** `restaurant_admin` (CRUD) | `waiter` (lectura/estado)
**Plan:** Básico y Premium

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/tables` | admin, waiter | Lista todas las mesas |
| `GET`    | `/tables/:id` | admin, waiter | Detalle de mesa |
| `POST`   | `/tables` | admin | Crear mesa |
| `PUT`    | `/tables/:id` | admin | Actualizar mesa |
| `PATCH`  | `/tables/:id/status` | admin, waiter | Cambiar estado |
| `DELETE` | `/tables/:id` | admin | Eliminar mesa |

### Estados válidos de mesa
| Estado | Descripción |
|--------|-------------|
| `available` | Disponible |
| `occupied` | Ocupada |
| `reserved` | Reservada |
| `cleaning` | En limpieza |

### Body: `POST /tables`
```json
{ "number": 12, "capacity": 4 }
```

---

## 📋 Módulo: Pedidos — `/api/v1/orders`

### Endpoints PWA (restaurant_admin)

| Método | Ruta | Plan | Descripción |
|--------|------|------|-------------|
| `GET`    | `/orders` | Todos | Lista pedidos (filtros: `status`, `tableId`, `dateFrom`, `dateTo`) |
| `GET`    | `/orders/active` | Todos | Pedidos activos del turno |
| `GET`    | `/orders/:id` | Todos | Detalle completo con ítems |
| `PATCH`  | `/orders/:id/status` | Todos | Cambiar estado del pedido |
| `PATCH`  | `/orders/:id/cancel` | Todos | Cancelar con motivo |

### Endpoint Público (sin JWT) — Para Llevar

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/orders` | 🔓 Crea orden `takeout` (comensal desde la PWA pública) |

### Body: `POST /orders` (público, Para Llevar)
```json
{
  "type": "takeout",
  "restaurantId": 3,
  "customerName": "Juan Pérez",
  "customerPhone": "81-9999-8888",
  "notes": "Sin cebolla",
  "items": [
    { "dishId": 5, "quantity": 2, "specialNotes": "Extra salsa" },
    { "dishId": 8, "quantity": 1 }
  ]
}
```

### Body: `PATCH /orders/:id/status`
```json
{ "status": "delivered" }
```

### Estados válidos del pedido
| Estado | Descripción |
|--------|-------------|
| `pending` | Nuevo / sin confirmar |
| `confirmed` | Confirmado |
| `preparing` | En cocina |
| `ready` | Listo para entrega |
| `delivered` | Entregado |
| `cancelled` | Cancelado |

---

## 📊 Módulo: Reportes — `/api/v1/reports`

**Rol requerido:** `restaurant_admin`

| Método | Ruta | Plan | Descripción |
|--------|------|------|-------------|
| `GET` | `/reports/sales` | Todos | Ventas por período (`today\|week\|month\|year\|custom`) |
| `GET` | `/reports/dishes/top` | Todos | Top platillos más vendidos |
| `GET` | `/reports/peak-hours` | Todos | Distribución pedidos por hora |
| `GET` | `/reports/category-income` | Todos | Ingresos por categoría |
| `GET` | `/reports/dishes/sold` | Todos | Platillos vendidos por menú |
| `GET` | `/reports/menus/summary` | Todos | Resumen de menús activos |
| `GET` | `/reports/inventory/cost` | ⭐ Premium | Insumos con mayor gasto |
| `GET` | `/reports/inventory/waste` | ⭐ Premium | Mermas por tipo y lote |
| `GET` | `/reports/staff` | ⭐ Premium | Rendimiento por empleado |
| `GET` | `/reports/kitchen/performance` | ⭐ Premium | Tiempo promedio de preparación |
| `GET` | `/reports/export` | Todos | Exportar CSV / XLSX |

### Query params comunes
```
GET /api/v1/reports/sales?period=month
GET /api/v1/reports/sales?period=custom&start=2026-01-01&end=2026-03-31
GET /api/v1/reports/export?type=sales&period=month&format=csv
```

---

## 🌐 Módulo: Menú Público — `/menu` (sin JWT)

Estos endpoints NO llevan `/api/v1`. Son para la PWA pública que ven los comensales.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/menu/:slug` | Menú activo del restaurante |
| `GET` | `/menu/:slug?mode=dine_in&table=5` | Modo restaurante (solo lectura) |
| `GET` | `/menu/:slug?mode=takeout` | Modo Para Llevar (con carrito) |
| `GET` | `/menu/:slug/order/:folio` | Estado de una orden Para Llevar |

### Ejemplo
```
GET http://localhost:3000/menu/demo-restaurant?mode=takeout
GET http://localhost:3000/menu/demo-restaurant?mode=dine_in&table=3
```

---

## 🛡️ Resumen de Planes

| Módulo | Plan Básico | Plan Premium |
|--------|-------------|--------------|
| Auth, Menús, Categorías, Platillos | ✅ | ✅ |
| Mesas (CRUD admin) | ✅ | ✅ |
| Pedidos (Para Llevar) | ✅ | ✅ |
| Reportes básicos | ✅ | ✅ |
| Inventario FIFO | ❌ | ✅ |
| Módulo Cocina | ❌ | ✅ |
| Reportes de staff y cocina | ❌ | ✅ |
| Roles waiter / chef / cashier | ❌ | ✅ |
| App Android | ❌ | ✅ |

---

## ⚡ Credenciales de desarrollo

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@foodify.com` | `cualquier6` | `restaurant_admin` |
| `admin@demo.foodify.mx` | `Demo2026!` | `restaurant_admin` |
| `admin@codex.foodify.mx` | `Codex2026!` | `saas_admin` |
