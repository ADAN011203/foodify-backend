// RUTA: src/modules/saas/dto/saas.dto.ts
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterRestaurantDto {
  @IsString() @MaxLength(120) restaurantName: string;
  @IsString() @MaxLength(120) slug: string;
  @IsString() @MaxLength(120) adminFullName: string;
  @IsEmail()                  adminEmail: string;
  @IsString() @MinLength(6)   adminPassword: string;
  @IsInt() @IsPositive()      planId: number;
  @IsOptional() @IsString()   timezone?: string;
}

export class UpdateSubscriptionStatusDto {
  @IsEnum(['trial','active','past_due','suspended','cancelled']) status: string;
}

export class ChangePlanDto {
  @IsInt() @IsPositive() planId: number;
}

export class RegisterPaymentDto {
  @IsPositive() amount: number;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() notes?: string;
}
