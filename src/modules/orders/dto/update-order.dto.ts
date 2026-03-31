/**
 * RUTA: src/modules/orders/dto/update-order.dto.ts
 */
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cancelReason?: string;
}

export class AddOrderItemDto {
  @IsInt() @IsPositive() dishId: number;
  @IsInt() @IsPositive() quantity: number;
  @IsOptional() @IsString() @MaxLength(500) specialNotes?: string;
}

export class UpdateOrderItemDto {
  @IsOptional() @IsInt() @IsPositive() quantity?: number;
  @IsOptional() @IsString() @MaxLength(500) specialNotes?: string;
}

/**
 * DTO para PATCH /orders/:id/scan-qr
 * Solo Plan Premium — App Android (waiter o cashier)
 */
export class ScanQrDto {
  @IsString()
  @IsOptional()
  qrCode?: string;
}
