# 🍽️ Prompt — Módulo de Menú para App Android

> **Instrucciones de uso:**
> Copia el bloque de abajo y pégalo en tu asistente de IA (Claude, Gemini, Copilot, etc.)
> para que te genere el código Kotlin del módulo de Menú.

---

## 🤖 PROMPT COMPLETO (copiar y pegar)

---

Soy desarrollador Android en Kotlin. Necesito que implementes el **módulo de Menú** para la app móvil **Foodify** (com.codex.foodify).

### Contexto del proyecto

La app ya tiene implementado:
- Autenticación con JWT guardado en DataStore/SharedPreferences encriptado
- Retrofit + OkHttp con interceptor que agrega `Authorization: Bearer <token>`
- MVVM: ViewModel + Repository + StateFlow / LiveData
- Navigation Component con BottomNavigationView en `AdminMainActivity`
- Los modelos `Menu`, `DishCategory`, `Dish`, `CreateDishRequest` están definidos en `Models.kt`
- Base URL configurable: `http://10.0.2.2:3000` (emulador), `http://192.168.x.x:3000` (WiFi)

### Rol del usuario

Este módulo es para el `restaurant_admin`.
El `role` está disponible en DataStore y se consulta desde el ViewModel.
El mesero (`waiter`) y el chef (`chef`) también consultan platillos en modo **lectura** para levantar pedidos y ver recetas, pero no pueden crear ni editar.

---

### API del backend (NestJS v3.2)

Todos los endpoints requieren:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Base path:** `http://10.0.2.2:3000/api/v1`

#### Menús — `/api/v1/menus`

```
GET    /menus                          → Lista todos los menús del restaurante
GET    /menus/:id                      → Detalle con categorías y platillos
POST   /menus                          → Crear nuevo menú
PUT    /menus/:id                      → Actualizar menú completo
PATCH  /menus/:id/status               → Activar / desactivar menú { isActive: true|false }
DELETE /menus/:id                      → Desactivar menú (soft delete)
GET    /menus/:id/categories           → Categorías de un menú
```

#### Categorías — `/api/v1/menus/:menuId/categories`

```
GET    /menus/:menuId/categories       → Categorías del menú
GET    /menus/:menuId/categories/:id   → Detalle de categoría
POST   /menus/:menuId/categories       → Crear categoría
PUT    /menus/:menuId/categories/:id   → Actualizar categoría
PATCH  /menus/:menuId/categories/:id/sort  → Reordenar { sortOrder: 2 }
DELETE /menus/:menuId/categories/:id   → Eliminar categoría
```

#### Platillos — `/api/v1/dishes`

```
GET    /dishes                         → Lista platillos (filtros: ?categoryId=, ?available=true, ?search=)
GET    /dishes/:id                     → Detalle con categoría
POST   /dishes                         → Crear platillo
PUT    /dishes/:id                     → Actualizar platillo
PATCH  /dishes/:id/availability        → Toggle disponibilidad (sin body)
DELETE /dishes/:id                     → Soft delete
PUT    /dishes/:id/images              → Subir imágenes (multipart/form-data, max 3)
```

---

### Respuestas del backend

#### `GET /menus`
```json
[
  {
    "id": 1,
    "name": "Menú del Día",
    "description": "De lunes a viernes",
    "isActive": true,
    "allowOutsideSchedule": true,
    "schedule": { "monday": {"open":"08:00","close":"16:00"} },
    "sortOrder": 0,
    "categories": [
      { "id": 3, "name": "Entradas", "menuId": 1, "sortOrder": 1 },
      { "id": 4, "name": "Platillos Fuertes", "menuId": 1, "sortOrder": 2 }
    ]
  }
]
```

#### `GET /dishes` (platillo individual)
```json
{
  "id": 5,
  "name": "Tacos de Birria",
  "description": "3 tacos con consomé",
  "price": 75.00,
  "prepTimeMin": 15,
  "isAvailable": true,
  "images": ["https://s3.amazonaws.com/foodify-assets/5-img0.jpg"],
  "allergens": ["gluten"],
  "marginPct": 42.5,
  "sortOrder": 1,
  "categoryId": 3,
  "category": { "id": 3, "name": "Entradas", "menuId": 1 }
}
```

---

### Modelos ya definidos en `Models.kt`

```kotlin
data class Menu(
    val id: Int,
    val name: String,
    val description: String? = null,
    @SerializedName("is_active") val isActive: Boolean = true,
    val schedule: Any? = null,
    @SerializedName("allow_outside_schedule") val allowOutsideSchedule: Boolean = true,
    val categories: List<DishCategory>? = null,
)

data class DishCategory(
    val id: Int,
    val name: String,
    @SerializedName("menu_id") val menuId: Int? = null,
)

data class Dish(
    val id: Int,
    val name: String,
    val price: Double,
    @SerializedName("prep_time_min") val prepTimeMin: Int = 15,
    val description: String? = null,
    @SerializedName("is_available") val isAvailable: Boolean = true,
    val images: List<String>? = null,
    @SerializedName("category_id") val categoryId: Int? = null,
    val category: DishCategory? = null,
    @SerializedName("margin_pct") val marginPct: Double? = null,
    val allergens: List<String>? = null,
)

data class CreateDishRequest(
    val name: String,
    val price: Double,
    @SerializedName("prep_time_min") val prepTimeMin: Int,
    val description: String? = null,
    @SerializedName("category_id") val categoryId: Int? = null,
    val allergens: List<String>? = null,
)
```

---

### Pantallas que necesito

#### 1. `MenuListFragment` — Lista de menús

- RecyclerView con tarjetas de menú
- Cada tarjeta muestra:
  - Nombre del menú
  - Switch ON/OFF para activar/desactivar (`PATCH /menus/:id/status`)
  - Número de categorías
  - Ícono de horario si tiene `schedule` definido
- FloatingActionButton "+" para crear nuevo menú
- Al tocar una tarjeta → navega a `MenuDetailFragment`
- Pull-to-refresh

#### 2. `MenuDetailFragment` — Detalle de menú con categorías y platillos

- Header con nombre del menú y estado (activo/inactivo)
- Lista de categorías (expandible con acordeón o tabs horizontales)
- Dentro de cada categoría: lista de platillos con:
  - Imagen (Glide/Coil), nombre, precio, tiempo preparación
  - Switch de disponibilidad (`PATCH /dishes/:id/availability`)
  - Badge "AGOTADO" si `isAvailable == false`
- Botón "Agregar categoría"
- Botón "Agregar platillo" por categoría
- Swipe-to-delete en platillos (con confirmación)

#### 3. `CreateMenuBottomSheet` (BottomSheetDialogFragment)

- Campo: Nombre del menú (requerido)
- Campo: Descripción (opcional)
- Switch: Permitir pedidos fuera de horario (`allowOutsideSchedule`)
- Botón "Crear Menú" → `POST /menus`

#### 4. `CreateDishBottomSheet` (BottomSheetDialogFragment)

- Campo: Nombre del platillo (requerido)
- Campo: Precio (NumberDecimal, requerido)
- Campo: Tiempo de preparación en minutos (NumberInteger, default 15)
- Campo: Descripción (opcional, multiline)
- Spinner: Categoría (cargado desde `GET /menus/:id/categories`)
- ChipGroup: Alérgenos (gluten, lácteos, mariscos, huevo, nueces, soya)
- Botón "Crear Platillo" → `POST /dishes`

#### 5. `DishDetailFragment`

- Imagen grande (Glide, con placeholder) — carrusel si hay más de una
- Nombre, precio, descripción
- Tiempo de preparación estimado
- Categoría
- Lista de alérgenos (chips)
- Margen de ganancia (si `marginPct != null`)
- Switch de disponibilidad
- Botón "Editar" → abre `EditDishBottomSheet`
- Botón "Eliminar" (con diálogo de confirmación)

#### 6. `EditDishBottomSheet`

- Mismo formulario que `CreateDishBottomSheet` pero pre-rellenado
- Llama `PUT /dishes/:id` al guardar

---

### Arquitectura requerida

```
ui/admin/menu/
├── MenuListFragment.kt           (lista de menús)
├── MenuDetailFragment.kt         (detalle: categorías + platillos)
├── DishDetailFragment.kt         (detalle de platillo individual)
├── CreateMenuBottomSheet.kt      (formulario nuevo menú)
├── CreateDishBottomSheet.kt      (formulario nuevo platillo)
├── EditDishBottomSheet.kt        (editar platillo existente)
└── MenuViewModel.kt              (StateFlow + funciones suspend)

data/repository/
└── MenuRepository.kt             (llama a FoodifyApi)

data/api/FoodifyApi.kt            (agregar endpoints de menús, categorías y platillos)
```

---

### Layouts XML que necesito

```
res/layout/
├── fragment_menu_list.xml          (RecyclerView + FAB)
├── fragment_menu_detail.xml        (tabs de categorías + platillos)
├── fragment_dish_detail.xml        (imagen, info, switch)
├── bottom_sheet_create_menu.xml
├── bottom_sheet_create_dish.xml
├── item_menu_card.xml              (tarjeta en la lista de menús)
├── item_dish_card.xml              (tarjeta de platillo en detalle de menú)
```

---

### Integración con la navegación existente

El módulo de Menú se accede desde:
- El `BottomNavigationView` del `AdminMainActivity` (ítem "Menú" o "Platillos")
- `MenuListFragment` es el destino raíz
- Desde `MenuListFragment` → `MenuDetailFragment` (con argumento `menuId: Int`)
- Desde `MenuDetailFragment` → `DishDetailFragment` (con argumento `dishId: Int`)

Agrega los destinos al `nav_graph.xml` existente con acciones de navegación.

---

### Notas adicionales

1. **Imágenes:** Usa Glide o Coil para cargar `images[0]`. Si no hay imagen, muestra un placeholder con el ícono de platillo.
2. **Precio:** Formatea como `$75.00` con `NumberFormat.getCurrencyInstance(Locale("es","MX"))`.
3. **Disponibilidad:** El switch de disponibilidad debe ser optimista (cambiar UI antes de que responda el server) y revertir si hay error.
4. **Alérgenos:** Muestra como chips con íconos de emoji: 🌾 Gluten, 🥛 Lácteos, 🦐 Mariscos, 🥚 Huevo, 🥜 Nueces, 🫘 Soya.
5. **Horario del menú:** Si `schedule != null`, muestra un chip "Tiene horario" en la tarjeta del menú. No necesitas implementar la edición del horario en esta versión.
6. **Acceso por rol:**
   - `restaurant_admin` → lectura + escritura completa (CRUD)
   - `waiter` y `chef` → **solo lectura** (`GET /dishes` y `GET /menus`), sin botones de crear/editar/eliminar
   - Oculta los FAB y botones de acción si el rol no es `restaurant_admin`
7. **Error 403:** Si el backend devuelve 403, muestra: _"No tienes permiso para esta acción"_.

---

### Lo que espero de ti

Por favor genera en orden:

1. **`FoodifyApi.kt`** — Agregar todos los endpoints de menús, categorías y platillos
2. **`MenuRepository.kt`** — Funciones suspend para cada llamada a la API
3. **`MenuViewModel.kt`** — StateFlow para lista de menús, detalle, lista de platillos; funciones para crear/editar/eliminar
4. **`MenuListFragment.kt`** + `fragment_menu_list.xml` + `item_menu_card.xml`
5. **`MenuDetailFragment.kt`** + `fragment_menu_detail.xml` + `item_dish_card.xml`
6. **`DishDetailFragment.kt`** + `fragment_dish_detail.xml`
7. **`CreateMenuBottomSheet.kt`** + `bottom_sheet_create_menu.xml`
8. **`CreateDishBottomSheet.kt`** + `bottom_sheet_create_dish.xml`
9. Actualizar **`nav_graph.xml`** con los destinos y acciones del módulo

Usa **Material Design 3**, **ViewBinding**, **Coroutines**, **StateFlow** y **Glide** para imágenes.

---

## 📌 Notas para Jorge

- El endpoint `GET /menus/:id` ya trae las categorías incluidas en la relación `categories`.
- Para obtener los platillos de una categoría usa `GET /dishes?categoryId=<id>`.
- El endpoint `GET /dishes` **filtra automáticamente por el restaurante del JWT** — no necesitas enviar el `restaurantId` manualmente.
- El toggle de disponibilidad (`PATCH /dishes/:id/availability`) **no requiere body** — simplemente alterna el estado actual.
- Credenciales de prueba con acceso completo: `admin@foodify.com` / `cualquier6` (role: `restaurant_admin`, plan: Premium trial).
- Para mesero de prueba: `maria.garcia@foodify.com` / `cualquier6` (role: `waiter`, solo lectura).
