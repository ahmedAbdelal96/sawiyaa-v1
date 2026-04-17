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
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PractitionerPayoutDestinationInputDto } from '@modules/practitioners/dto/practitioner-payout-destination.dto';
import { PractitionerSpecialtySelectionInputDto } from '@modules/practitioners/dto/practitioner-specialty-selection.dto';

export class CreateAdminPractitionerCredentialDto {
  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  credentialType!: CredentialType;

  @ApiProperty({
    example: 'https://files.example.com/credential.pdf',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
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
  password!: string;

  @ApiPropertyOptional({
    example: 'Dr. New Practitioner',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  displayName?: string;

  @ApiPropertyOptional({
    enum: PractitionerType,
    default: PractitionerType.OTHER,
  })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({ enum: PractitionerGender })
  @IsOptional()
  @IsEnum(PractitionerGender)
  practitionerGender?: PractitionerGender | null;

  @ApiPropertyOptional({
    example: 'Clinical Psychologist',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  professionalTitle?: string;

  @ApiPropertyOptional({
    example: 'Short professional bio',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string;

  @ApiPropertyOptional({
    example: 6,
  })
  @IsOptional()
  @IsInt()
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    example: 'EG',
    description: 'ISO-2 country code',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  countryCode?: string;

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

  @ApiPropertyOptional({
    type: PractitionerPayoutDestinationInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerPayoutDestinationInputDto)
  payoutDestination?: PractitionerPayoutDestinationInputDto | null;

  @ApiPropertyOptional({
    type: [CreateAdminPractitionerCredentialDto],
    description: 'Optional initial credential metadata records',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateAdminPractitionerCredentialDto)
  credentials?: CreateAdminPractitionerCredentialDto[];

  @ApiPropertyOptional({
    example: 'Created directly by admin ops',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
