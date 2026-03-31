// RUTA: src/modules/categories/dto/category.dto.ts
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() schedule?: object;
  @IsOptional() sortOrder?: number;
}
export class UpdateCategoryDto extends CreateCategoryDto {}
