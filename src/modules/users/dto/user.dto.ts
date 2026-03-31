// RUTA: src/modules/users/dto/user.dto.ts
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEnum(UserRole)           role: UserRole;
  @IsString() @MaxLength(120) fullName: string;
  @IsEmail()                  email: string;
  @IsString() @MinLength(6)   password: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(120) fullName?: string;
  @IsOptional() @IsString() @MaxLength(20)  phone?: string;
  @IsOptional() @IsBoolean()                isActive?: boolean;
}
