import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// A form's field definitions are validated loosely (free-form JSON array) so the
// drag-drop builder can evolve field shapes without backend redeploys.
export class CreateFormDto {
  @IsString() @MaxLength(120) name: string;
  @IsString() @MaxLength(120) slug: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsArray() fields?: unknown[];
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() @MaxLength(80) submitLabel?: string;
  @IsOptional() @IsString() @MaxLength(500) successMessage?: string;
  @IsOptional() @IsBoolean() recaptcha?: boolean;
}

export class UpdateFormDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsArray() fields?: unknown[];
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() @MaxLength(80) submitLabel?: string;
  @IsOptional() @IsString() @MaxLength(500) successMessage?: string;
  @IsOptional() @IsBoolean() recaptcha?: boolean;
}

export class SubmitFormDto {
  @IsObject() data: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(120) verificationAction?: string;
  @IsOptional() @IsString() @MaxLength(3000) humanVerificationToken?: string;
  @IsOptional() @IsString() @MaxLength(40) humanVerificationAnswer?: string;
}

export class SetSubmissionStatusDto {
  @IsString() @IsIn(['NEW', 'IN_PROGRESS', 'RESPONDED', 'CLOSED']) status: string;
  @IsOptional() @IsString() @MaxLength(120) assignee?: string;
}

export class SubmissionNoteDto {
  @IsString() @MaxLength(5000) body: string;
}

export class SubmissionReplyDto {
  @IsString() @MaxLength(200) subject: string;
  @IsString() @MaxLength(8000) body: string;
}
