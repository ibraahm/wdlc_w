import { IsString, IsOptional, IsBoolean, IsEmail, MaxLength, IsIn, Matches, IsDateString } from 'class-validator';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
] as const;

export class CreateApplicationDto {
  @IsOptional() @IsIn(['INDIVIDUAL', 'BUSINESS']) applicantType?: string;
  @IsString() @MaxLength(120) firstName: string;
  @IsString() @MaxLength(120) lastName: string;
  @IsOptional() @IsString() @MaxLength(200) company?: string;
  @IsString() @MaxLength(300) businessStreet: string;
  @IsString() @IsIn(['United States']) businessCountry: string;
  @IsString() @IsIn(US_STATES) businessState: string;
  @IsString() @MaxLength(120) businessCity: string;
  @IsString() @MaxLength(10) @Matches(/^\d{5}(?:-\d{4})?$/, { message: 'businessZip must be a valid U.S. ZIP code' }) businessZip: string;
  @IsString() @MaxLength(12) @Matches(/^\+1[2-9]\d{2}[2-9]\d{6}$/, { message: 'businessPhone must be a valid U.S. phone number' }) businessPhone: string;
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

  @IsString() @MaxLength(200) signatureName: string;
  @IsOptional() @IsString() @MaxLength(120) signatureTitle?: string;
  @IsBoolean() signatureConsent: boolean;
  @IsString() @MaxLength(1000) signatureConsentText: string;
  @IsOptional() @IsDateString() signatureClientTimestamp?: string;
  // The signer's browser user-agent, captured client-side so the record is the
  // real browser rather than the server-to-server hop.
  @IsOptional() @IsString() @MaxLength(500) signatureUserAgent?: string;

  @IsOptional() @IsString() @MaxLength(60) anticipatedDollarVolume?: string;
  @IsOptional() @IsString() @MaxLength(1000) humanVerificationToken?: string;
  @IsOptional() @IsString() @MaxLength(20) humanVerificationAnswer?: string;
}

export class UpdateApplicationStatusDto {
  @IsString() @IsIn(['NEW', 'REVIEWING', 'APPROVED', 'REJECTED']) status: string;
}
