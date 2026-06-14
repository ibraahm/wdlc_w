import {
  ArrayMaxSize,
  IsArray,
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

export class UpsertCourseDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(100_000) contentHtml?: string;
  // Accepts a JSON string or an array; validated in the service.
  @IsOptional() questions?: unknown;
  @IsOptional() @IsInt() @Min(1) @Max(100) passingScore?: number;
  @IsOptional() @IsIn(AUDIENCE) audience?: string;
  @IsOptional() @IsString() @MaxLength(400) targetStates?: string;
  @IsOptional() @IsString() @MaxLength(2000) targetBranches?: string;
  @IsOptional() @IsIn(STATUS) status?: string;
  @IsOptional() @IsInt() order?: number;
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
