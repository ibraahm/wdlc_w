import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(10, { message: 'Password must be at least 10 characters' }) password: string;
  @IsOptional() @IsString() role?: string; // SUPER_ADMIN | COMPLIANCE_OFFICER | MANAGER | EDITOR
}

export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(10) newPassword: string;
}
