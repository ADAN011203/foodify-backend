/**
 * RUTA: src/modules/orders/dto/create-order.dto.ts
 *
 * v3.2 — Soporta dos orígenes de creación:
 *
 *   1. App Android (JWT requerido) — dine_in
 *      Roles: waiter, restaurant_admin
 *      Requiere: tableId
 *
 *   2. PWA Pública (sin JWT — @Public) — takeout
 *      Origen: comensal desde sección "Para Llevar"
 *      Requiere: customerName, customerPhone
 *      NO requiere: tableId, waiterId
 */
import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsPositive, IsString, MaxLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '../entities/order.entity';

export class CreateOrderItemDto {
  @IsInt()
  @IsPositive()
  dishId: number;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialNotes?: string;
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  type: OrderType;

  // ── dine_in (App Android, con JWT) ─────────────────────────────
  /** ID de la mesa. Requerido para type=dine_in */
  @IsOptional()
  @IsInt()
  @IsPositive()
  tableId?: number;

  // ── takeout (PWA pública, sin JWT) — v3.2 ──────────────────────
  /**
   * Nombre del comensal.
   * Requerido cuando type=takeout y la petición viene sin JWT.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  /**
   * Teléfono del comensal.
   * Requerido cuando type=takeout y la petición viene sin JWT.
   */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
