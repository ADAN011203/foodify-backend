# 📦 Prompt — Módulo de Inventario FIFO para App Android

> **Instrucciones de uso:**
> Copia el bloque de abajo y pégalo en tu asistente de IA (Claude, Gemini, Copilot, etc.)
> para que te genere el código Kotlin del módulo de inventario.

---

## 🤖 PROMPT COMPLETO (copiar y pegar)

---

Soy Jorge, desarrollador Android en Kotlin. Necesito que implementes el **módulo de Inventario FIFO** para la app móvil **Foodify** (com.codex.foodify).

### Contexto del proyecto

La app ya tiene implementado:
- Autenticación con JWT (guardado en DataStore/SharedPreferences encriptado)
- Retrofit + OkHttp con interceptor de Authorization
- MVVM: ViewModel + Repository + LiveData/StateFlow
- Navigation Component con Bottom Navigation
- El modelo `InventoryItem`, `InventoryLot`, `InventoryAlert` ya están en `Models.kt`
- Base URL: `http://10.0.2.2:3000` (emulador) / configurable por BuildConfig

### Rol del usuario

Este módulo solo es visible para `restaurant_admin` con Plan **Premium**.
El `role` y `planName` están guardados en DataStore y se leen desde el ViewModel.

### API del backend (NestJS v3.2)

Todos los endpoints requieren:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Base path:** `http://10.0.2.2:3000/api/v1/inventory`

#### Items (insumos base)
```
GET    /inventory/items              → Lista de insumos con stock y alertas
POST   /inventory/items              → Registrar nuevo insumo
GET    /inventory/items/:id          → Detalle + lotes + movimientos
PUT    /inventory/items/:id          → Actualizar insumo
```

#### Lotes (entradas de mercancía FIFO)
```
GET    /inventory/lots               → Lotes activos
GET    /inventory/lots?itemId=3      → Lotes de un insumo específico
GET    /inventory/lots?status=low    → Lotes por estado
GET    /inventory/lots?expiringSoon=true → Lotes próximos a caducar
POST   /inventory/lots               → Nueva entrada de mercancía
PUT    /inventory/lots/:id           → Editar lote
DELETE /inventory/lots/:id           → Dar de baja por merma
```

#### Movimientos y ajustes
```
GET    /inventory/movements          → Historial de movimientos FIFO
GET    /inventory/movements?lotId=5  → Movimientos de un lote
POST   /inventory/adjustments        → Ajuste manual de stock (positivo o negativo)
```

#### Alertas
```
GET    /inventory/alerts             → Alertas activas (alertFlag=true)
PATCH  /inventory/alerts/:id/resolve → Marcar alerta como resuelta
```

### Modelos de datos ya definidos en Models.kt

```kotlin
data class InventoryItem(
    val id: Int,
    val name: String,
    val unit: String,
    @SerializedName("min_stock") val minStock: Double = 0.0,
    @SerializedName("current_stock") val currentStock: Double = 0.0,
    val category: String? = null,
    val alerts: List<InventoryAlert>? = null,
) {
    val hasAlert: Boolean get() = !alerts.isNullOrEmpty() && alerts.any { !it.isResolved }
}

data class InventoryLot(
    val id: Int,
    @SerializedName("item_id") val itemId: Int,
    val item: InventoryItem? = null,
    @SerializedName("lot_number") val lotNumber: String? = null,
    val quantity: Double,
    val remaining: Double,
    @SerializedName("unit_cost") val unitCost: Double,
    val supplier: String? = null,
    @SerializedName("entry_date") val entryDate: String,
    @SerializedName("expiry_date") val expiryDate: String? = null,
    val status: String = "available",
    val alertFlag: Boolean? = null,
) {
    val displayStatus: String get() = when (status) {
        "available" -> "Disponible"
        "low"       -> "Próximo a caducar"
        "critical"  -> "Stock crítico"
        "expired"   -> "Caducado"
        "depleted"  -> "Sin stock"
        else        -> status
    }
    val isAlert: Boolean get() = alertFlag ?: (status != "available")
}

data class InventoryAlert(
    val id: Int,
    @SerializedName("item_id") val itemId: Int,
    val type: String,
    val message: String,
    @SerializedName("is_resolved") val isResolved: Boolean = false,
)

data class CreateLotRequest(
    @SerializedName("item_id") val itemId: Int,
    val quantity: Double,
    @SerializedName("unit_cost") val unitCost: Double,
    val supplier: String? = null,
    @SerializedName("entry_date") val entryDate: String,
    @SerializedName("expiry_date") val expiryDate: String? = null,
    @SerializedName("lot_number") val lotNumber: String? = null,
)
```

### Pantallas que necesito

#### 1. InventoryListFragment (`ui/admin/inventory/`)
- RecyclerView con tarjetas de insumos
- Cada tarjeta muestra:
  - Nombre del insumo, unidad (kg, L, pzas)
  - Stock actual vs stock mínimo (barra de progreso)
  - Categoría si existe
  - Ícono de alerta 🔴 si `hasAlert == true`
- FloatingActionButton para registrar nuevo insumo
- Chip filters: "Todos" | "Con alerta" | "Stock crítico"
- Pull-to-refresh

#### 2. InventoryDetailFragment
- Header con nombre del insumo y stock actual
- Lista de lotes activos (RecyclerView)
  - Cada lote: número de lote, cantidad restante, fecha caducidad, proveedor, estado
  - Color según estado: verde/amarillo/naranja/rojo/gris
- Botón FAB: "Nueva entrada" (abre BottomSheet)

#### 3. AddLotBottomSheet (BottomSheetDialogFragment)
- Spinner/AutoCompleteTextView para seleccionar insumo (viene de GET /inventory/items)
- Campos: cantidad, costo unitario, proveedor, fecha entrada (DatePicker), fecha caducidad (DatePicker opcional), número de lote (opcional)
- Botón "Registrar entrada"

#### 4. InventoryAlertsFragment
- Lista de alertas activas
- Cada alerta: nombre del insumo, tipo de alerta, mensaje descriptivo
- Botón "Resolver" por cada alerta → `PATCH /inventory/alerts/:id/resolve`

#### 5. AdjustmentBottomSheet
- Para hacer ajustes manuales de stock
- Select insumo + cantidad (puede ser negativa para merma) + nota

### Arquitectura requerida

```
ui/admin/inventory/
├── InventoryFragment.kt          (tab principal — lista de insumos)
├── InventoryDetailFragment.kt    (detalle de un insumo + sus lotes)
├── InventoryAlertsFragment.kt    (alertas activas)
├── AddLotBottomSheet.kt          (nueva entrada de mercancía)
├── AdjustmentBottomSheet.kt      (ajuste manual de stock)
└── InventoryViewModel.kt         (StateFlow + suspend fun)

data/repository/
└── InventoryRepository.kt        (llama a FoodifyApi)

data/api/
└── FoodifyApi.kt                 (agregar endpoints de inventario)
```

### Integración con la navegación existente

El módulo de inventario se accede desde:
- El BottomNavigationView de `AdminMainActivity` (ya existe, con ítem "Inventario")
- O desde un tab si se prefiere ViewPager2

El ícono sugerido: `@drawable/ic_inventory` o `ic_baseline_inventory_2_24`

### Notas adicionales

1. **Alertas badge**: Si hay alertas activas (`GET /inventory/alerts` retorna lista no vacía), mostrar un badge rojo en el ícono de inventario del BottomNavigationView.
2. **Estado de stock visual**: Usa una `ProgressBar` horizontal con colores:
   - Verde: `currentStock > minStock * 1.5`
   - Amarillo: `currentStock > minStock && currentStock <= minStock * 1.5`
   - Rojo: `currentStock <= minStock`
3. **Fechas**: El backend devuelve fechas en formato ISO 8601. Conviértelas a `dd/MM/yyyy` para mostrar al usuario.
4. **Manejo de errores**: Si el plan no es Premium, el backend retorna `403 Forbidden`. Muestra un mensaje: _"Esta función requiere Plan Premium"_.
5. **Alias de compatibilidad**: También puedes usar `GET /api/inventario` (ruta alias) si ya tienes endpoints configurados con ese path.

### Lo que espero de ti

Por favor genera:
1. `FoodifyApi.kt` actualizado con los endpoints de inventario
2. `InventoryRepository.kt` completo
3. `InventoryViewModel.kt` con StateFlow para cada pantalla
4. `InventoryFragment.kt` con RecyclerView y adapter
5. `InventoryDetailFragment.kt`
6. `AddLotBottomSheet.kt`
7. Los layouts XML correspondientes:
   - `fragment_inventory.xml`
   - `fragment_inventory_detail.xml`
   - `bottom_sheet_add_lot.xml`
   - `item_inventory_card.xml` (item del RecyclerView)
   - `item_lot_card.xml`

Usa Material Design 3, ViewBinding, Coroutines y StateFlow.

---

## 📌 Notas para Jorge

- El endpoint **`/api/v1/inventory`** requiere que el usuario tenga `role = restaurant_admin` Y `planName = Premium`.
- Si usas las credenciales de prueba `admin@foodify.com / cualquier6`, ya tienes acceso (el restaurante demo tiene plan Premium trial).
- El alias `/api/inventario` también funciona si ya tienes esa ruta configurada en tu `NetworkModule.kt`.
- Después de agregar el módulo, ejecuta `npm run seed:android` si necesitas recrear el usuario de prueba.
