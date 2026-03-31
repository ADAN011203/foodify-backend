// RUTA: app/src/main/java/com/codex/foodify/data/api/TokenManager.kt
package com.codex.foodify.data.api

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Almacena el accessToken en SharedPreferences (lectura síncrona).
 *
 * ¿Por qué SharedPreferences y no DataStore?
 * El OkHttp Interceptor no puede usar suspend / coroutines.
 * SharedPreferences.getString() es síncrono → cero deadlock.
 *
 * DataStore sigue siendo la fuente de verdad para los Flows de la UI.
 * TokenManager solo existe para que el interceptor pueda leer el token.
 */
@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val prefs =
        context.getSharedPreferences("foodify_token", Context.MODE_PRIVATE)

    /** Leer el token (síncrono — seguro desde el interceptor de OkHttp). */
    fun getAccessToken(): String? = prefs.getString("access_token", null)

    /** Guardar el token después del login. */
    fun saveAccessToken(token: String) =
        prefs.edit().putString("access_token", token).apply()

    /** Limpiar en logout. */
    fun clear() = prefs.edit().clear().apply()
}
