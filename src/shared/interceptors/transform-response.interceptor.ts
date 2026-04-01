/**
 * RUTA: src/shared/interceptors/transform-response.interceptor.ts
 * Envuelve todas las respuestas en formato { data, meta, status }.
 * Incluye AMBOS formatos de keys (camelCase + snake_case) para
 * compatibilidad con Android y PWA.
 */
import {
  CallHandler, ExecutionContext,
  Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map }        from 'rxjs/operators';

/**
 * Convierte camelCase a snake_case.
 *   sortOrder → sort_order
 *   isActive  → is_active
 *   menuId    → menu_id
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Duplica recursivamente TODAS las keys: conserva la original y agrega
 * la versión snake_case (si difiere). Así ambos clientes (PWA camelCase
 * y Android snake_case) leen los campos sin problemas.
 */
function transformKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const transformed = transformKeys(value);
      result[key] = transformed;                       // camelCase original
      const snake = toSnakeCase(key);
      if (snake !== key) result[snake] = transformed;  // snake_case duplicado
    }
    return result;
  }
  return obj;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        // Si el service ya retorna { data, meta } respetarlo
        if (payload && typeof payload === 'object' && 'data' in payload) {
          return transformKeys({ status: 200, ...payload });
        }
        return transformKeys({ data: payload, status: 200 });
      }),
    );
  }
}
