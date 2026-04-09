/**
 * RUTA: src/app.module.ts
 *
 * v3.2 — CAMBIOS:
 *   - PlanGuard registrado como APP_GUARD global
 *   - Sin referencias al rol 'manager'
 *   - SaasSubscription importado para PlanGuard
 *   - PublicMenuModule incluido
 */
import { Module }            from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { APP_GUARD }         from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule }        from '@nestjs/bull';

// Guards globales
import { JwtAuthGuard }   from './shared/guards/jwt-auth.guard';
import { RolesGuard }     from './shared/guards/roles.guard';
import { PlanGuard }      from './shared/guards/plan.guard';

// Módulos de la aplicación
import { AuthModule }        from './modules/auth/auth.module';
import { UsersModule }       from './modules/users/users.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { SaasModule }        from './modules/saas/saas.module';
import { PaymentsModule }    from './modules/payments/payments.module';
import { MenusModule }       from './modules/menus/menus.module';
import { CategoriesModule }  from './modules/categories/categories.module';
import { DishesModule }      from './modules/dishes/dishes.module';
import { RecipesModule }     from './modules/recipes/recipes.module';
import { InventoryModule }   from './modules/inventory/inventory.module';
import { TablesModule }      from './modules/tables/tables.module';
import { OrdersModule }      from './modules/orders/orders.module';
import { KitchenModule }     from './modules/kitchen/kitchen.module';
import { ReportsModule }     from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PublicMenuModule }  from './modules/public-menu/public-menu.module';

// Entidad necesaria para PlanGuard
import { SaasSubscription } from './modules/saas/entities/saas-subscription.entity';

@Module({
  imports: [
    // ── Configuración global ──────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal:  true,
      envFilePath: '.env',
    }),

    // ── Base de datos MySQL ───────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'mysql',
        host:        config.get<string>('DATABASE_HOST', '127.0.0.1'),
        port:        config.get<number>('DATABASE_PORT', 3306),
        username:    config.get<string>('DATABASE_USER'),
        password:    config.get<string>('DATABASE_PASSWORD'),
        database:    config.get<string>('DATABASE_NAME'),
        entities:    [__dirname + '/modules/**/*.entity{.ts,.js}'],
        migrations:  [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: true,   // TEMPORAL: true para crear columnas faltantes (archived_in_kitchen, etc)
        charset:     'utf8mb4',
        timezone:    'Z',
        poolSize:    config.get<number>('DATABASE_POOL_SIZE', 10),
        logging:     config.get<string>('NODE_ENV') === 'development'
          ? ['error', 'warn']
          : ['error'],
      }),
    }),

    // ── Entidad SaasSubscription para PlanGuard (APP_GUARD global) ─
    TypeOrmModule.forFeature([SaasSubscription]),

    // ── Rate limiting ─────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl:   config.get<number>('THROTTLE_TTL', 60) * 1000,
        limit: config.get<number>('THROTTLE_LIMIT', 100),
      }]),
    }),

    // ── BullMQ (colas para notificaciones, emails) ────────────────
    BullModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    // ── Módulos de dominio ────────────────────────────────────────
    AuthModule,
    UsersModule,
    RestaurantsModule,
    SaasModule,
    PaymentsModule,
    MenusModule,
    CategoriesModule,
    DishesModule,
    RecipesModule,
    InventoryModule,
    TablesModule,
    OrdersModule,
    KitchenModule,
    ReportsModule,
    NotificationsModule,
    PublicMenuModule,    // PWA pública — sin JWT
  ],

  providers: [
    // ── Guards globales (orden de ejecución) ──────────────────────
    {
      provide:  APP_GUARD,
      useClass: ThrottlerGuard,   // 1. Rate limiting
    },
    {
      provide:  APP_GUARD,
      useClass: JwtAuthGuard,     // 2. JWT (respeta @Public())
    },
    {
      provide:  APP_GUARD,
      useClass: RolesGuard,       // 3. Roles (sin 'manager')
    },
    {
      provide:  APP_GUARD,
      useClass: PlanGuard,        // 4. Plan (bloquea cashier/waiter/chef en Básico)
    },
  ],
})
export class AppModule {}
