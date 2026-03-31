// RUTA: src/config/redis.config.ts
import { ConfigService } from '@nestjs/config';

export const getRedisConfig = (config: ConfigService) => ({
  host: config.get<string>('REDIS_HOST', '127.0.0.1'),
  port: config.get<number>('REDIS_PORT', 6379),
});
