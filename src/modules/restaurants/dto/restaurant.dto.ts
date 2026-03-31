// RUTA: src/modules/restaurants/dto/restaurant.dto.ts
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRestaurantDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(50)  timezone?: string;
}

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean() show_sales?: boolean;
  @IsOptional() @IsBoolean() show_top_dishes?: boolean;
  @IsOptional() @IsBoolean() show_peak_hours?: boolean;
  @IsOptional() @IsBoolean() show_category_income?: boolean;
  @IsOptional() @IsBoolean() show_dishes_by_menu?: boolean;
}
