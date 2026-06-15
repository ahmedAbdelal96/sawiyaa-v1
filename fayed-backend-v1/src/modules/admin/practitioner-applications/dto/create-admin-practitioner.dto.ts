import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CredentialType,
  PractitionerGender,
  PractitionerType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PractitionerPayoutDestinationInputDto } from '@modules/practitioners/dto/practitioner-payout-destination.dto';
import { PractitionerSpecialtySelectionInputDto } from '@modules/practitioners/dto/practitioner-specialty-selection.dto';

export class CreateAdminPractitionerCredentialDto {
  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  credentialType!: CredentialType;

  @ApiProperty({
    example:
      '/uploads/practitioners/admin-direct-create/credentials/license.pdf',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @Matches(/^\/uploads\/.+/, {
    message: 'credential file url must reference a managed upload path',
  })
  fileUrl!: string;

  @ApiPropertyOptional({
    example: '2028-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * Direct admin practitioner creation payload.
 * This bypasses practitioner self-submission and creates an approved baseline practitioner account.
 */
export class CreateAdminPractitionerDto {
  @ApiProperty({
    example: 'new.practitioner@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    example: 'StrongP@ssw0rd',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'password must include at least one lowercase letter, one uppercase letter, and one number',
  })
  password!: string;

  @ApiProperty({
    example: 'Dr. New Practitioner',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  displayName!: string;

  @ApiProperty({
    enum: PractitionerType,
  })
  @IsEnum(PractitionerType)
  practitionerType!: PractitionerType;

  @ApiPropertyOptional({ enum: PractitionerGender })
  @IsOptional()
  @IsEnum(PractitionerGender)
  practitionerGender?: PractitionerGender | null;

  @ApiProperty({
    example: 'Clinical Psychologist',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  professionalTitle!: string;

  @ApiProperty({
    example: 'Short professional bio',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  bio!: string;

  @ApiProperty({
    example: 6,
  })
  @IsInt()
  @Min(1)
  yearsOfExperience!: number;

  @ApiPropertyOptional({
    example: 250,
    description: '30-minute session price in EGP',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sessionPrice30Egp?: number | null;

  @ApiPropertyOptional({
    example: 8,
    description: '30-minute session price in USD',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sessionPrice30Usd?: number | null;

  @ApiPropertyOptional({
    example: 450,
    description: '60-minute session price in EGP',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sessionPrice60Egp?: number | null;

  @ApiPropertyOptional({
    example: 15,
    description: '60-minute session price in USD',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sessionPrice60Usd?: number | null;

  @ApiProperty({
    example: 'EG',
    description: 'ISO-2 country code',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  countryCode!: string;

  @ApiProperty({
    type: [String],
    description:
      'Lowercase language codes linked to the practitioner profile, such as ar/en.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languageCodes!: string[];

  @ApiProperty({
    type: PractitionerSpecialtySelectionInputDto,
    description: 'Primary category plus validated sub-specialties',
  })
  @ValidateNested()
  @Type(() => PractitionerSpecialtySelectionInputDto)
  specialtySelection!: PractitionerSpecialtySelectionInputDto;

  @ApiProperty({
    type: PractitionerPayoutDestinationInputDto,
  })
  @ValidateNested()
  @Type(() => PractitionerPayoutDestinationInputDto)
  payoutDestination!: PractitionerPayoutDestinationInputDto;

  @ApiProperty({
    type: [CreateAdminPractitionerCredentialDto],
    description: 'Initial credential metadata records stored via safe upload.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateAdminPractitionerCredentialDto)
  credentials!: CreateAdminPractitionerCredentialDto[];

  @ApiPropertyOptional({
    example: 'Created directly by admin ops',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
