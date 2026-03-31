// RUTA: app/src/main/java/com/codex/foodify/data/repository/AuthRepository.kt
package com.codex.foodify.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import com.codex.foodify.data.api.ACCESS_TOKEN_KEY
import com.codex.foodify.data.api.PLAN_NAME_KEY
import com.codex.foodify.data.api.REFRESH_TOKEN_KEY
import com.codex.foodify.data.api.RESTAURANT_ID_KEY
import com.codex.foodify.data.api.USER_ID_KEY
import com.codex.foodify.data.api.USER_ROLE_KEY
import com.codex.foodify.data.api.TokenManager
import com.codex.foodify.data.api.FoodifyApi
import com.codex.foodify.data.api.dataStore
import com.codex.foodify.data.model.LoginRequest
import com.codex.foodify.data.model.LoginResponse
import com.codex.foodify.data.model.UserRole
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

// ─── Resultado genérico para todas las operaciones de red ─────────
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val code: Int = 0) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

@Singleton
class AuthRepository @Inject constructor(
    private val api: FoodifyApi,
    private val tokenManager: TokenManager,       // ← gestión síncrona del token
    @ApplicationContext private val context: Context,
) {

    // ─── Flows de la UI (DataStore como fuente de verdad) ─────────

    val accessToken: Flow<String?> =
        context.dataStore.data.map { it[ACCESS_TOKEN_KEY] }

    val userRoleRaw: Flow<String?> =
        context.dataStore.data.map { it[USER_ROLE_KEY] }

    val planName: Flow<String?> =
        context.dataStore.data.map { it[PLAN_NAME_KEY] }

    val restaurantId: Flow<Int?> =
        context.dataStore.data.map { it[RESTAURANT_ID_KEY]?.toIntOrNull() }

    val isLoggedIn: Flow<Boolean> =
        context.dataStore.data.map { !it[ACCESS_TOKEN_KEY].isNullOrEmpty() }

    // ─── Login ────────────────────────────────────────────────────

    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                saveSession(body)
                Result.Success(body)
            } else {
                val errorMsg = when (response.code()) {
                    401  -> "Credenciales inválidas"
                    403  -> parseForbiddenError(response.errorBody()?.string())
                    429  -> "Demasiados intentos. Espera un momento."
                    500  -> "Error del servidor. Intenta más tarde."
                    else -> "Error al iniciar sesión (${response.code()})"
                }
                Result.Error(errorMsg, response.code())
            }
        } catch (e: Exception) {
            Result.Error("Sin conexión al servidor. Verifica tu red.")
        }
    }

    // ─── Guardar sesión ───────────────────────────────────────────

    /**
     * Guarda el token en DOS lugares:
     *
     * 1. [TokenManager] (SharedPreferences síncrono) → lo usa el interceptor
     *    de OkHttp para adjuntar Authorization: Bearer en cada request.
     *
     * 2. DataStore → lo usan los Flows de la UI (isLoggedIn, role, plan, etc.)
     *
     * ⚠️ No uses DataStore en el interceptor de OkHttp — el runBlocking
     *    sobre Dispatchers.IO causa deadlock y el token llega como null.
     */
    private suspend fun saveSession(response: LoginResponse) {
        // 1. SharedPreferences síncrono — para el OkHttp Interceptor
        tokenManager.saveAccessToken(response.accessToken)

        // 2. DataStore — para los Flows de la UI
        context.dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN_KEY]  = response.accessToken
            prefs[REFRESH_TOKEN_KEY] = response.refreshToken
            prefs[USER_ROLE_KEY]     = response.role
            prefs[PLAN_NAME_KEY]     = response.planName
            // ← CORRECCIÓN: restaurantId faltaba en la versión anterior
            prefs[RESTAURANT_ID_KEY] = response.restaurantId?.toString() ?: ""
        }
    }

    // ─── Logout ───────────────────────────────────────────────────

    suspend fun logout() {
        try { api.logout() } catch (_: Exception) {}
        tokenManager.clear()                      // ← limpiar SharedPreferences
        context.dataStore.edit { it.clear() }     // ← limpiar DataStore
    }

    // ─── FCM Token (push notifications Android) ───────────────────

    suspend fun updateFcmToken(token: String) {
        try {
            api.updateFcmToken(mapOf("fcmToken" to token))
        } catch (_: Exception) {}
    }

    // ─── Helpers de rol y plan ────────────────────────────────────

    fun getUserRole(): Flow<UserRole> =
        userRoleRaw.map { r -> UserRole.from(r ?: "restaurant_admin") }

    fun isPremium(): Flow<Boolean> =
        planName.map { plan -> plan?.lowercase()?.contains("premium") == true }

    fun isAdmin(): Flow<Boolean> =
        userRoleRaw.map { r -> r == UserRole.RESTAURANT_ADMIN.displayName }

    fun isWaiter(): Flow<Boolean> =
        userRoleRaw.map { r -> r == UserRole.WAITER.displayName }

    fun isChef(): Flow<Boolean> =
        userRoleRaw.map { r -> r == UserRole.CHEF.displayName }

    // ─── Parseo de errores 403 ────────────────────────────────────

    private fun parseForbiddenError(body: String?): String = when {
        body?.contains("ACCOUNT_SUSPENDED") == true -> "Cuenta suspendida. Contacta a CODEX."
        body?.contains("ACCOUNT_CANCELLED") == true -> "Cuenta cancelada."
        body?.contains("PAYMENT_OVERDUE")   == true -> "Pago vencido. Solo lectura disponible."
        body?.contains("Plan Premium")      == true -> "Este rol requiere Plan Premium."
        else                                        -> "Acceso no autorizado"
    }
}
