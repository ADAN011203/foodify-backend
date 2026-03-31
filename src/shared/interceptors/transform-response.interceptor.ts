/**
 * RUTA: src/shared/interceptors/transform-response.interceptor.ts
 * Envuelve todas las respuestas en formato { data, meta, status }.
 */
import {
  CallHandler, ExecutionContext,
  Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map }        from 'rxjs/operators';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        // Si el service ya retorna { data, meta } respetarlo
        if (payload && typeof payload === 'object' && 'data' in payload) {
          return { status: 200, ...payload };
        }
        return { data: payload, status: 200 };
      }),
    );
  }
}
