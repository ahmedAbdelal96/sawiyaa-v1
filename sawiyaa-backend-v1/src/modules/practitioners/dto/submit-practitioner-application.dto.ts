import { ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerGender, PractitionerType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PractitionerPayoutDestinationInputDto } from './practitioner-payout-destination.dto';
import { PractitionerSpecialtySelectionInputDto } from './practitioner-specialty-selection.dto';
import { PractitionerProfessionalContentDto } from './practitioner-professional-content.dto';

export class SubmitPractitionerApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  professionalTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string | null;

  @ApiPropertyOptional({
    type: PractitionerProfessionalContentDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerProfessionalContentDto)
  professionalContent?: PractitionerProfessionalContentDto | null;

  @ApiPropertyOptional({ enum: ['ar', 'en'], nullable: true })
  @IsOptional()
  @IsEnum(['ar', 'en'])
  primaryContentLocale?: 'ar' | 'en' | null;

  @ApiPropertyOptional({
    description: 'Active country ISO code for practitioner profile linkage',
  })
  @IsOptional()
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Za-z]{2,3}$/)
  countryCode?: string | null;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsOfExperience?: number | null;

  @ApiPropertyOptional({ enum: PractitionerType })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({
    description:
      'Internal draft semantic marker. True only after the applicant explicitly selects a practitioner type.',
  })
  @IsOptional()
  @IsBoolean()
  practitionerTypeExplicit?: boolean;

  @ApiPropertyOptional({ enum: PractitionerGender })
  @IsOptional()
  @IsEnum(PractitionerGender)
  practitionerGender?: PractitionerGender | null;

  @ApiPropertyOptional({ enum: ['ar', 'en'] })
  @IsOptional()
  @IsString()
  @Matches(/^(ar|en)$/)
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Lowercase language codes linked to the practitioner profile, such as ar/en.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languageCodes?: string[];

  @ApiPropertyOptional({
    type: PractitionerSpecialtySelectionInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerSpecialtySelectionInputDto)
  specialtySelection?: PractitionerSpecialtySelectionInputDto;

  @ApiPropertyOptional({
    type: PractitionerPayoutDestinationInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerPayoutDestinationInputDto)
  payoutDestination?: PractitionerPayoutDestinationInputDto | null;

  @ApiPropertyOptional({
    description:
      'Optional practitioner avatar image reference or data URL submitted as part of the review snapshot.',
    maxLength: 2000000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000000)
  avatarUrl?: string | null;
}
