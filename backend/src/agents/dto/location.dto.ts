import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsString() @MaxLength(200) businessName: string;
  @IsOptional() @IsString() @MaxLength(300) addressLine?: string;
  @IsString() @MaxLength(120) city: string;
  @IsString() @MaxLength(120) state: string;
  @IsOptional() @IsString() @MaxLength(20) zip?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(60) publicPhone?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateLocationDto {
  @IsOptional() @IsString() @MaxLength(200) businessName?: string;
  @IsOptional() @IsString() @MaxLength(300) addressLine?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) state?: string;
  @IsOptional() @IsString() @MaxLength(20) zip?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(60) publicPhone?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
