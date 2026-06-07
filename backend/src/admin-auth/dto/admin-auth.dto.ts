import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(12, { message: 'Admin passwords must be at least 12 characters' })
  password: string;

  @IsOptional()
  @IsString()
  role?: string; // SUPER_ADMIN | COMPLIANCE_OFFICER | MANAGER | EDITOR
}

export class AdminRefreshDto {
  @IsString()
  refreshToken: string;
}

export class AdminForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class AdminResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(12)
  newPassword: string;
}

export class AdminChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(12)
  newPassword: string;
}
