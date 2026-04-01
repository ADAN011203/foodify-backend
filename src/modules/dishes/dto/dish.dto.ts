// RUTA: src/modules/dishes/dto/dish.dto.ts
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateDishDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsNumber() @IsPositive()
  price: number;

  @IsOptional() @IsNumber()
  costEst?: number;

  @IsOptional() @IsNumber()
  cost_est?: number;

  @IsOptional() @IsNumber()
  prepTimeMin?: number;

  @IsOptional() @IsNumber()
  prep_time_min?: number;

  @IsOptional() @IsNumber()
  categoryId?: number;

  @IsOptional() @IsNumber()
  category_id?: number;

  @IsOptional() @IsArray()
  allergens?: string[];

  @IsOptional() @IsArray()
  images?: string[];

  @IsOptional()
  sortOrder?: number;

  @IsOptional()
  sort_order?: number;

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}

export class UpdateDishDto extends CreateDishDto {}

