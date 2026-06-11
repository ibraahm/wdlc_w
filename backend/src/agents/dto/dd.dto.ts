import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
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
  @IsString()
  @MaxLength(200)
  reviewedBy: string;

  @IsOptional()
  @IsISO8601()
  nextReviewDueAt?: string;
}
