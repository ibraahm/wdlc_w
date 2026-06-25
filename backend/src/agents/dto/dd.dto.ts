import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { DD_STAGES, RISK_RATINGS } from '../dd-catalog';

export class CreateDDFileDto {
  @IsString()
  @MaxLength(200)
  agentName: string;

  @IsOptional()
  @IsIn(['BUSINESS', 'INDIVIDUAL'])
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  states?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  regionalOffice?: string;

  // Optionally seed the file from an existing public application.
  @IsOptional()
  @IsString()
  applicationId?: string;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsBoolean()
  present?: boolean;

  @IsOptional()
  @IsISO8601()
  expiry?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  dropboxUrl?: string;
}

export class SetStageDto {
  @IsIn(DD_STAGES as unknown as string[])
  stage: string;
}

export class SetRiskDto {
  @IsIn(RISK_RATINGS as unknown as string[])
  riskRating: string;
}

export class RecordReviewDto {
  // Reviewer is derived server-side from the signed-in admin; kept optional for
  // backward compatibility but ignored in favour of the authenticated identity.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reviewedBy?: string;

  @IsOptional()
  @IsISO8601()
  nextReviewDueAt?: string;
}

export class SetBranchCodeDto {
  // 6 lowercase alphanumeric characters, e.g. uswdlc - the agent's permanent ID.
  @Matches(/^[a-z0-9]{6}$/, { message: 'Branch code must be exactly 6 lowercase letters/digits (e.g. uswdlc)' })
  branchCode: string;
}

export class AddSignatureDocDto {
  @IsString() @MaxLength(200) label: string;
  @IsOptional() @IsString() @MaxLength(60) method?: string;
}

export class UpdateSignatureDocDto {
  @IsOptional() @IsString() @MaxLength(200) label?: string;
  @IsOptional() @IsIn(['PENDING', 'SENT', 'SIGNED', 'DECLINED']) status?: string;
  @IsOptional() @IsString() @MaxLength(60) method?: string | null;
  @IsOptional() @IsISO8601() sentAt?: string | null;
  @IsOptional() @IsISO8601() signedAt?: string | null;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
}
