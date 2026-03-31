// RUTA: src/modules/inventory/dto/inventory.dto.ts
//
// DTOs compatibles con los campos que Jorge usa en la App Android.
// Se mapean los nombres de Jorge → nombres del backend v3.2.
import {
  IsDateString, IsEnum, IsNotEmpty, IsNumber,
  IsOptional, IsPositive, IsString, MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ─── Items ────────────────────────────────────────────────────────
export class CreateItemDto {
  /** Jorge: nombreInsumo */
  @IsString() @IsNotEmpty() @MaxLength(120)
  name: string;

  /** Jorge: unidadMedida — valores: "Kg", "L", "Pz" (y también "g", "ml") */
  @IsString() @IsNotEmpty() @MaxLength(20)
  unit: string;

  @IsOptional() @IsNumber()
  minStock?: number;

  @IsOptional() @IsString() @MaxLength(60)
  category?: string;
}

export class UpdateItemDto extends CreateItemDto {}

// ─── Lotes ────────────────────────────────────────────────────────
export class CreateLotDto {
  @Transform(({ value, obj }) => value ?? obj?.item_id)
  @IsOptional() @IsNumber() @IsPositive()
  itemId?: number;
  /** Alias Android */
  @IsOptional() @IsNumber() @IsPositive()
  item_id?: number;

  @Transform(({ value, obj }) => value ?? obj?.lot_number)
  @IsOptional() @IsString() @MaxLength(50)
  lotNumber?: string;
  /** Alias Android */
  @IsOptional() @IsString() @MaxLength(50)
  lot_number?: string;

  /** Jorge: cantidad */
  @Transform(({ value, obj }) => value ?? obj?.cantidad)
  @IsNumber() @IsPositive()
  quantity: number;

  @Transform(({ value, obj }) => value ?? obj?.unit_cost)
  @IsOptional() @IsNumber() @IsPositive()
  unitCost?: number;
  /** Alias Android */
  @IsOptional() @IsNumber() @IsPositive()
  unit_cost?: number;

  /** Jorge: proveedor */
  @IsOptional() @IsString() @MaxLength(120)
  supplier?: string;

  /**
   * Fecha de ingreso al almacén.
   * Formato ISO: "2026-03-15" (el frontend Android envía "dd/MM/yyyy" → convertir)
   */
  @Transform(({ value, obj }) => value ?? obj?.entry_date)
  @IsOptional() @IsDateString()
  entryDate?: string;
  /** Alias Android */
  @IsOptional() @IsDateString()
  entry_date?: string;

  /**
   * Jorge: fechaCaducidad — formato "dd/MM/yyyy" en la App.
   * El servicio convierte a Date.
   */
  @Transform(({ value, obj }) => value ?? obj?.expiry_date)
  @IsOptional() @IsDateString()
  expiryDate?: string;
  /** Alias Android */
  @IsOptional() @IsDateString()
  expiry_date?: string;

  // ── Alta rapida de insumo desde pantalla "Nuevo Lote" ────────────
  // Si no viene itemId/item_id o no existe, el backend puede crear el
  // insumo usando estos campos y despues registrar el lote.
  @Transform(({ value, obj }) => value ?? obj?.item_name ?? obj?.ingredient_name ?? obj?.nombreIngrediente)
  @IsOptional() @IsString() @MaxLength(120)
  itemName?: string;
  @IsOptional() @IsString() @MaxLength(120)
  item_name?: string;
  @IsOptional() @IsString() @MaxLength(120)
  ingredient_name?: string;
  @IsOptional() @IsString() @MaxLength(120)
  nombreIngrediente?: string;

  @Transform(({ value, obj }) => value ?? obj?.unidad ?? obj?.unidadMedida)
  @IsOptional() @IsString() @MaxLength(20)
  unit?: string;
  @IsOptional() @IsString() @MaxLength(20)
  unidad?: string;
  @IsOptional() @IsString() @MaxLength(20)
  unidadMedida?: string;
}

export class UpdateLotDto {
  @IsOptional() @IsString() @MaxLength(50)  lotNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) supplier?: string;
  @IsOptional() @IsDateString()             expiryDate?: string;
}

// ─── Ajustes manuales ─────────────────────────────────────────────
export class AdjustmentDto {
  @IsNumber() @IsPositive()
  lotId: number;

  /** cantidad a ajustar (positivo = entrada, negativo = merma) */
  @IsNumber()
  quantity: number;

  @IsOptional() @IsString() @MaxLength(255)
  notes?: string;
}
