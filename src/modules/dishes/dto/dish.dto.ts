// RUTA: src/modules/dishes/dto/dish.dto.ts
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
export class CreateDishDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @IsPositive() price: number;
  @IsOptional() @IsNumber() costEst?: number;
  @IsOptional() @IsNumber() prepTimeMin?: number;
  @IsOptional() @IsNumber() categoryId?: number;
  @IsOptional() @IsArray() allergens?: string[];
  @IsOptional() sortOrder?: number;
}
export class UpdateDishDto extends CreateDishDto {}
