/**
 * RUTA: src/modules/kitchen/dto/kitchen.dto.ts
 */
import {
  IsArray, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsPositive, IsString,
  MaxLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum KitchenOrderStatus {
  PENDING   = 'pending',
  PREPARING = 'preparing',
  READY     = 'ready',
  DELIVERED = 'delivered',
}

export enum KitchenItemStatus {
  PENDING   = 'pending',
  PREPARING = 'preparing',
  READY     = 'ready',
  SERVED    = 'served',
}

export class UpdateKitchenStatusDto {
  @IsEnum(KitchenOrderStatus)
  status: KitchenOrderStatus;
}

export class UpdateItemStatusDto {
  @IsEnum(KitchenItemStatus)
  status: KitchenItemStatus;
}

export class RecipeIngredientDto {
  @IsOptional() @IsInt() @IsPositive()
  itemId?: number;           // FK a inventory_items (si aplica FIFO)

  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsPositive()
  quantity: number;

  @IsString() @IsNotEmpty() @MaxLength(20)
  unit: string;

  @IsOptional()
  isOptional?: boolean;
}

export class RecipeStepDto {
  @IsInt() @IsPositive()
  order: number;

  @IsString() @IsNotEmpty() @MaxLength(500)
  description: string;
}

export class CreateRecipeDto {
  @IsInt() @IsPositive()
  dishId: number;

  @IsOptional() @IsInt() @IsPositive()
  prepTimeMin?: number;

  @IsOptional() @IsInt() @IsPositive()
  servings?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeStepDto)
  steps?: RecipeStepDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients?: RecipeIngredientDto[];

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}
