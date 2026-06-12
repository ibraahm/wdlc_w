import { IsEmail, IsString, MinLength, IsOptional, IsIn, IsBoolean } from 'class-validator';

export const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR'] as const;

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  humanVerificationToken?: string;

  @IsOptional()
  @IsString()
  humanVerificationAnswer?: string;
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
  @IsIn(ADMIN_ROLES, { message: `role must be one of: ${ADMIN_ROLES.join(', ')}` })
  role?: string;
}

export class AdminRefreshDto {
  @IsString()
  refreshToken: string;
}

export class AdminSetActiveDto {
  @IsBoolean()
  active: boolean;
}

export class AdminForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  humanVerificationToken?: string;

  @IsOptional()
  @IsString()
  humanVerificationAnswer?: string;
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
