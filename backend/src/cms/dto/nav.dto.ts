import { IsString, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';

export class CreateNavItemDto {
  @IsString() @MaxLength(120) label: string;
  @IsString() @MaxLength(300) href: string;

  @IsOptional() @IsString() location?: string;   // 'HEADER' | 'FOOTER'
  @IsOptional() @IsString() @MaxLength(120) column?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsBoolean() visible?: boolean;
}

export class UpdateNavItemDto {
  @IsOptional() @IsString() @MaxLength(120) label?: string;
  @IsOptional() @IsString() @MaxLength(300) href?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() @MaxLength(120) column?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsBoolean() visible?: boolean;
}
