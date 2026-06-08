import { IsString, IsOptional, IsBoolean, IsEmail, MaxLength, IsIn } from 'class-validator';

export class CreateApplicationDto {
  @IsString() @MaxLength(120) firstName: string;
  @IsString() @MaxLength(120) lastName: string;
  @IsString() @MaxLength(200) company: string;
  @IsString() @MaxLength(300) businessStreet: string;
  @IsString() @MaxLength(120) businessCountry: string;
  @IsOptional() @IsString() @MaxLength(120) businessState?: string;
  @IsString() @MaxLength(120) businessCity: string;
  @IsString() @MaxLength(20) businessZip: string;
  @IsString() @MaxLength(60) businessPhone: string;
  @IsEmail() @MaxLength(200) email: string;

  @IsOptional() @IsString() @MaxLength(120) howFound?: string;
  @IsOptional() @IsString() @MaxLength(200) howFoundOther?: string;
  @IsOptional() @IsString() @MaxLength(120) businessType?: string;
  @IsOptional() @IsString() @MaxLength(200) businessTypeOther?: string;
  @IsOptional() @IsString() @MaxLength(120) productsOffered?: string;

  @IsOptional() @IsBoolean() currentlyProvides?: boolean;
  @IsOptional() @IsString() @MaxLength(120) currentProvider?: string;
  @IsOptional() @IsString() @MaxLength(200) currentProviderOther?: string;
  @IsOptional() @IsBoolean() providedPast?: boolean;
  @IsOptional() @IsString() @MaxLength(120) pastProvider?: string;
  @IsOptional() @IsString() @MaxLength(200) pastProviderOther?: string;
  @IsOptional() @IsBoolean() declinedBefore?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) declinedExplain?: string;

  @IsOptional() @IsString() @MaxLength(120) preferredLanguage?: string;
  @IsOptional() @IsString() @MaxLength(120) preferredLanguageOther?: string;
  @IsOptional() @IsString() @MaxLength(120) monthlyVolume?: string;
  @IsOptional() @IsString() @MaxLength(60) totalLocations?: string;
  @IsOptional() @IsString() @MaxLength(2000) comments?: string;
}

export class UpdateApplicationStatusDto {
  @IsString() @IsIn(['NEW', 'REVIEWING', 'APPROVED', 'REJECTED']) status: string;
}
