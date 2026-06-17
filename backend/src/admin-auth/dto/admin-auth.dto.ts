import { IsEmail, IsString, MinLength, IsOptional, IsIn, IsBoolean } from 'class-validator';

export const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR', 'REGIONAL_OFFICER', 'AUDITOR'] as const;

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

  @IsOptional()
  @IsString()
  regionalOfficeId?: string;

  // ISO date/time after which a time-bound role (e.g. AUDITOR) loses access.
  @IsOptional()
  @IsString()
  accessExpiresAt?: string;
}

export class SetUserRegionDto {
  @IsOptional()
  @IsString()
  regionalOfficeId?: string | null;
}

export class AdminInviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsIn(ADMIN_ROLES, { message: `role must be one of: ${ADMIN_ROLES.join(', ')}` })
  role?: string;

  @IsOptional()
  @IsString()
  regionalOfficeId?: string;

  // ISO date/time after which a time-bound role (e.g. AUDITOR) loses access.
  @IsOptional()
  @IsString()
  accessExpiresAt?: string;
}

export class AdminGoogleLoginDto {
  @IsString()
  @MinLength(20)
  credential: string;
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
