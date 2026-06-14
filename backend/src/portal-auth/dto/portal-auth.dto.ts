import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class AgentSignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number' })
  phone?: string;

  // Min 10 chars, must contain uppercase, lowercase, digit, special char
  @IsString()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#\-_])[A-Za-z\d@$!%*?&^#\-_]{10,}$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsOptional()
  @IsString()
  humanVerificationToken?: string;

  @IsOptional()
  @IsString()
  humanVerificationAnswer?: string;
}

export class AgentLoginDto {
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

export class AgentRefreshDto {
  @IsString()
  refreshToken: string;
}

export class AgentForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  humanVerificationToken?: string;

  @IsOptional()
  @IsString()
  humanVerificationAnswer?: string;
}

export class AgentResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#\-_])[A-Za-z\d@$!%*?&^#\-_]{10,}$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}

export class AgentChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#\-_])[A-Za-z\d@$!%*?&^#\-_]{10,}$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}

export class ResendVerifyDto {
  @IsEmail()
  email: string;
}

export class GoogleLoginDto {
  // The Google Identity Services ID token (a signed JWT). Verified server-side.
  @IsString()
  @MinLength(20)
  credential: string;
}
