/**
 * RUTA: src/main.ts
 *
 * Bootstrap de la aplicación NestJS.
 * Configuración: CORS, Helmet, ValidationPipe global, Socket.io con Redis adapter.
 */
import { NestFactory }    from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService }  from '@nestjs/config';
import helmet             from 'helmet';
import { IoAdapter }      from '@nestjs/platform-socket.io';
import { createAdapter }  from '@socket.io/redis-adapter';
import { createClient }   from 'redis';

import { AppModule }                    from './app.module';
import { AllExceptionsFilter }          from './shared/filters/http-exception.filter';
import { TransformResponseInterceptor } from './shared/interceptors/transform-response.interceptor';

/**
 * Convierte recursivamente las keys de un objeto de snake_case a camelCase.
 * Permite que la App Android envíe prep_time_min, category_id, etc.
 * y el ValidationPipe los acepte como prepTimeMin, categoryId.
 *
 * Ejemplos:
 *   prep_time_min → prepTimeMin
 *   category_id   → categoryId
 *   is_available  → isAvailable
 */
function snakeToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, val]) => [
        key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        snakeToCamel(val),
      ]),
    );
  }
  return obj;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);

  // ── Prefijo global de la API ──────────────────────────────────────
  app.setGlobalPrefix('api/v1', {
    // Las rutas del menú público no llevan el prefijo /api/v1
    exclude: ['menu/:slug', 'menu/:slug/order/:folio'],
  });

  // ── Seguridad ─────────────────────────────────────────────────────
  app.use(helmet());

  // ── Normalización snake_case → camelCase (App Android) ───────────
  // La App Android envía prep_time_min, category_id, etc. (snake_case).
  // El ValidationPipe espera camelCase (prepTimeMin, categoryId).
  // Este middleware normaliza el body ANTES del pipe, sin afectar la PWA
  // (que ya envía camelCase y la función es idempotente para camelCase).
  app.use((req: any, _res: any, next: () => void) => {
    if (req.body && typeof req.body === 'object') {
      req.body = snakeToCamel(req.body);
    }
    next();
  });

  // ── CORS ──────────────────────────────────────────────────────────
  const corsOrigins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin:      corsOrigins,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Validación global ─────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:        true,   // elimina propiedades no declaradas en DTOs
      forbidNonWhitelisted: true,
      transform:        true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Filtro global de excepciones ──────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Interceptor global de respuesta ──────────────────────────────
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // ── Redis adapter para WebSockets (Socket.io) ─────────────────────
  // Permite escalar horizontalmente manteniendo los rooms en Redis.
  try {
    const redisHost = config.get<string>('REDIS_HOST', '127.0.0.1');
    const redisPort = config.get<number>('REDIS_PORT', 6379);

    const pubClient = createClient({ url: `redis://${redisHost}:${redisPort}` });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    const redisAdapter = createAdapter(pubClient, subClient);

    // @ts-ignore — tipos del adapter y NestJS no siempre coinciden
    app.useWebSocketAdapter(new IoAdapter(app));
  } catch (err) {
    console.warn('[WebSocket] Redis no disponible, usando adapter en memoria:', err.message);
  }

  // ── Puerto ────────────────────────────────────────────────────────
  const port = config.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════╗
║   🍽  FOODIFY Backend v3.2                 ║
║   http://localhost:${port}/api/v1              ║
║   Menú público: /menu/:slug                ║
╚════════════════════════════════════════════╝
  `);
}

bootstrap();
