// RUTA: src/config/env.validation.ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV:            Joi.string().valid('development','production','test').default('development'),
  PORT:                Joi.number().default(3001),
  DATABASE_HOST:       Joi.string().default('127.0.0.1'),
  DATABASE_PORT:       Joi.number().default(3306),
  DATABASE_USER:       Joi.string().required(),
  DATABASE_PASSWORD:   Joi.string().required(),
  DATABASE_NAME:       Joi.string().required(),
  DATABASE_POOL_SIZE:  Joi.number().default(10),
  REDIS_HOST:          Joi.string().default('127.0.0.1'),
  REDIS_PORT:          Joi.number().default(6379),
  JWT_ACCESS_SECRET:   Joi.string().required(),
  JWT_REFRESH_SECRET:  Joi.string().required(),
  JWT_ACCESS_EXPIRES:  Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('30d'),
  CORS_ORIGINS:        Joi.string().default('http://localhost:3001'),
  THROTTLE_TTL:        Joi.number().default(60),
  THROTTLE_LIMIT:      Joi.number().default(100),
  AWS_S3_BUCKET:       Joi.string().allow('').default(''),
  FIREBASE_PROJECT_ID: Joi.string().allow('').default(''),
  SMTP_HOST:           Joi.string().allow('').default(''),
});
