import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// Fields an agent can edit for their own public locator listing.
export class UpdateAgentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  publicPhone?: string;

  @IsOptional()
  @IsBoolean()
  showOnMap?: boolean;
}

// Admin override for an agent listing.
export class AdminAgentVisibilityDto {
  @IsOptional()
  @IsBoolean()
  showOnMap?: boolean;
}

export class AdminAgentStatusDto {
  @IsIn(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'])
  status: string;
}
