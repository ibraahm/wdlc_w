import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const AUDIENCE = ['ALL', 'STATE', 'AGENT'];
const STATUS = ['DRAFT', 'PUBLISHED'];

export class SubmitQuizDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  answers: number[];
}

export class SetLanguageDto {
  @IsString() @MaxLength(8) language: string;
}

export class UpsertCourseDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(100_000) contentHtml?: string;
  @IsOptional() questions?: unknown;
  @IsOptional() @IsInt() @Min(1) @Max(100) passingScore?: number;
  @IsOptional() @IsIn(AUDIENCE) audience?: string;
  @IsOptional() @IsString() @MaxLength(400) targetStates?: string;
  @IsOptional() @IsString() @MaxLength(2000) targetBranches?: string;
  @IsOptional() @IsIn(STATUS) status?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() @MaxLength(8) language?: string;
  @IsOptional() @IsString() @MaxLength(80) translationGroup?: string;
  @IsOptional() @IsString() @MaxLength(40) dueAt?: string;
  @IsOptional() @IsBoolean() requireLessons?: boolean;
  @IsOptional() @IsBoolean() requireAck?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) policyStatement?: string;
}

export class UpsertSectionDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpsertLessonDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() @MaxLength(100_000) contentHtml?: string;
  @IsOptional() @IsString() @MaxLength(1000) videoUrl?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100000) durationMinutes?: number;
}

export class UpsertResourceDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(1000) url?: string;
  @IsOptional() @IsIn(AUDIENCE) audience?: string;
  @IsOptional() @IsString() @MaxLength(400) targetStates?: string;
  @IsOptional() @IsString() @MaxLength(2000) targetBranches?: string;
  @IsOptional() @IsIn(STATUS) status?: string;
  @IsOptional() @IsInt() order?: number;
}
