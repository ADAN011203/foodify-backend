// RUTA: src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService }       from '@nestjs/config';
import { DataSource }          from 'typeorm';
import * as dotenv             from 'dotenv';

dotenv.config();

export const getDatabaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type:           'mysql',
  host:           config.get<string>('DATABASE_HOST', '127.0.0.1'),
  port:           config.get<number>('DATABASE_PORT', 3306),
  username:       config.get<string>('DATABASE_USER', 'foodify'),
  password:       config.get<string>('DATABASE_PASSWORD', 'foodify_pass'),
  database:       config.get<string>('DATABASE_NAME', 'foodify_db'),
  entities:       [__dirname + '/../modules/**/*.entity{.ts,.js}'],
  migrations:     [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize:    false,
  charset:        'utf8mb4',
  timezone:       'Z',
  poolSize:       config.get<number>('DATABASE_POOL_SIZE', 10),
  logging:        config.get<string>('NODE_ENV') === 'development' ? ['error','warn'] : ['error'],
});

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  username: process.env.DATABASE_USER || 'foodify',
  password: process.env.DATABASE_PASSWORD || 'foodify_pass',
  database: process.env.DATABASE_NAME || 'foodify_db',
  entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  charset: 'utf8mb4',
  timezone: 'Z',
});
