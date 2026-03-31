// RUTA: src/modules/categories/dto/category.dto.ts
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  icon?: string;

  @IsOptional()
  schedule?: object;

  /** camelCase — usado por PWA */
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  /** snake_case — usado por App Android */
  @IsOptional() @IsInt() @Min(0)
  sort_order?: number;

  /** Activo/Inactivo — usado por App Android */
  @IsOptional() @IsBoolean()
  is_active?: boolean;
}

export class UpdateCategoryDto extends CreateCategoryDto {}

