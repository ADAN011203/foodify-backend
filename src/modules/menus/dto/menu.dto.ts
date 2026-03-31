// RUTA: src/modules/menus/dto/menu.dto.ts
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMenuDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() schedule?: object;
  @IsOptional() @IsBoolean() allowOutsideSchedule?: boolean;
  @IsOptional() sortOrder?: number;
}
export class UpdateMenuDto extends CreateMenuDto {}
