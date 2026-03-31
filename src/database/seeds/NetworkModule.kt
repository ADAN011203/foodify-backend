// RUTA: app/src/main/java/com/codex/foodify/data/api/NetworkModule.kt
package com.codex.foodify.data.api

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.codex.foodify.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

// ─── DataStore keys ───────────────────────────────────────────────
val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "foodify_prefs")
val ACCESS_TOKEN_KEY  = stringPreferencesKey("access_token")
val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
val USER_ROLE_KEY     = stringPreferencesKey("user_role")
val USER_ID_KEY       = stringPreferencesKey("user_id")
val PLAN_NAME_KEY     = stringPreferencesKey("plan_name")
val RESTAURANT_ID_KEY = stringPreferencesKey("restaurant_id")

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * Interceptor de autenticación.
     *
     * ⚠️ POR QUÉ NO USAMOS DATASTORE AQUÍ:
     * DataStore es asíncrono (suspend/Flow). Usarlo con runBlocking
     * dentro de un interceptor de OkHttp (que ya corre en Dispatchers.IO)
     * agota el pool de hilos y provoca deadlock → el token llega como null
     * → el header Authorization nunca se adjunta → 401.
     *
     * ✅ SOLUCIÓN: TokenManager guarda el token en SharedPreferences
     * de forma síncrona. El interceptor lo lee sin coroutines.
     */
    @Provides
    @Singleton
    fun provideAuthInterceptor(tokenManager: TokenManager): Interceptor =
        Interceptor { chain ->
            val token = tokenManager.getAccessToken()   // síncrono, sin coroutines
            val request = if (!token.isNullOrEmpty()) {
                chain.request().newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
            } else {
                chain.request()
            }
            chain.proceed(request)
        }

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: Interceptor): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)            // 1° agrega Authorization
            .addInterceptor(                            // 2° loguea (verás el header)
                HttpLoggingInterceptor().apply {
                    level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                            else HttpLoggingInterceptor.Level.NONE
                }
            )
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideFoodifyApi(retrofit: Retrofit): FoodifyApi =
        retrofit.create(FoodifyApi::class.java)
}
