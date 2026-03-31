# 🚀 Guía de Pruebas: Cómo Usar Postman con Foodify v3.2

Esta guía detallada es para cualquier desarrollador (o profesor) que necesite interactuar con la API directamente para probar la lógica de negocio sin depender de una interfaz visual (PWA o Móvil).

---

## 📥 1. Importar la Colección

1. Abre tu aplicación cliente de **Postman**.
2. En la parte superior izquierda, haz clic en el botón naranja que dice **"Import"**.
3. Arrastra el archivo **`Foodify_v3.2_Postman_Collection.json`** o búscalo navegando los archivos desde el botón "Upload Files".
4. Verás que en tu pestaña de _Collections_ (Colecciones) aparecerá la carpeta raíz **FOODIFY API v3.2 — Equipo CODEX**.

---

## ⚙️ 2. Entendiendo las Variables y Entorno
No necesitas crear un *Environment* (Entorno) por separado. La colección ya trae todas las variables necesarias guardadas internamente.

Si haces clic en la carpeta raíz (`FOODIFY API v3.2 — Equipo CODEX`) y vas a la pestaña **Variables**, notarás datos clave:
- `base_url`: `http://localhost:3000` *(Apunta a donde debe correr nuestra API)*.
- `access_token` y `refresh_token`: Vacíos. Se llenan solos al iniciar sesión.

> [!INFO]
> Al presionar *Send* en un endpoint de tu colección, fíjate en la URL. Verás algo como `{{base_url}}/api/v1/auth/login`. Postman lee automáticamente el `base_url` de la pestaña de Variables y ejecuta `http://localhost:3000/api...`

---

## 🔑 3. El Flujo de Autenticación (¡IMPORTANTE!)

Prácticamente todos los endpoints de nuestra API están asegurados. Si intentas crear un menú o pedir una orden ahora mismo te arrojará **Error 401 Unauthorized**.

Para poder probar la API, debes conseguir tu *"Boleto de acceso"* (JWT Token).

### Paso a paso para Loguearse:
1. Abre la carpeta **"1. 🔐 Auth — /api/v1/auth"**.
2. Selecciona el request **`Login (saas_admin CODEX)`** o **`Login (restaurant_admin demo)`**.
3. Verás que en la pestaña de **Body** ya está escrito el email y la contraseña correcta.
4. Presiona el botón azul **Send**.
5. Deberás recibir un `"status": 200` y un bloque `data` con tu token.
6. **¡MAGIA!**: No tienes que copiar y pegar el token cada vez. Hemos programado un _"Script de Prueba"_ (Pestaña "Tests" en Postman) que detecta el login exitoso y guarda el token por ti en la variable `access_token`.

A partir de este instante, todos los demás endpoints que vayas abriendo en Postman heredarán este token en la pestaña **Authorization > Bearer Token**.

---

## 🏃 4. Cómo Modificar Datos (POST, PUT, PATCH)

A diferencia del método GET (Traer información), cuando quieras probar la inserción de datos (ej. agregar un Platillo o una Mesa nueva), debes enviarle datos crudos (JSON).

1. Abre el endpoint que vas a probar, por ejemplo: **`POST /api/v1/dishes`**.
2. Ve a la pestaña **Body** debajo de la URL.
3. Asegúrate que las opciones seleccionadas sean **raw** y **JSON** (en texto azul a la derecha).
4. Verás algo básico como:
   ```json
   {
       "name": "string",
       "price": 100,
       "categoryId": 1
   }
   ```
5. Sustituye esos valores genéricos por lo que en realidad quieres enviar. Sustituye `"string"` por `"Hamburguesa CODEX"` y el precio por `150`.
6. Presiona **Send**. Debería arrojar código **201 Created** indicando éxito en la base de datos.

---

## ⚠️ 5. Advertencias Frecuentes al Probar (Error 400 y 404)

Puesto que nuestra base de datos MySQL tiene fuertes "llaves foráneas" (referencias conectadas), **no puedes correr los endpoints al azar de arriba a abajo.**
 
1. **La API respeta la Ley Física del Software**: ¡No puedes pedir que tu Platillo se asigne a una `categoryId = 99` si en tu tabla de Categorías aún no has creado la categoría `99`!
2. **Error 404 Not Found**: Significa habitualmente que intentaste actualizar algo con un `ID` inexistente en la Base de Datos. Ejemplo: Actualizar mesa `ID 3`, pero ¿has insertado esa mesa primero?
3. **Recomendación Cero Estrés**: Haz tus pruebas de forma Lógica, simulando la vida real:
   - *Login (Administrador)*
   - *Crear Categoría para los menús* 
   - *Crear Platillo (Atado a la subcategoría creada)*
   - *Crear Mesa* 
   - *Efectuar una Orden (pidiendo que nos sirvan en la mesa y del platillo creado)*.

**Con esto, deberías estar un 100% equipado para diagnosticar, probar y presumir la eficiencia de la v3.2 del Backend CODEX.**
