import { ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerGender, PractitionerType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
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
import { PractitionerPayoutDestinationInputDto } from '@modules/practitioners/dto/practitioner-payout-destination.dto';
import { PractitionerSpecialtySelectionInputDto } from '@modules/practitioners/dto/practitioner-specialty-selection.dto';

/**
 * Admin can amend practitioner draft/submitted data before final approve/reject decisions.
 * This payload keeps updates explicit and bounded to onboarding-related fields only.
 */
export class UpdatePractitionerApplicationDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  displayName?: string;

  @ApiPropertyOptional({ enum: PractitionerType })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({ enum: PractitionerGender })
  @IsOptional()
  @IsEnum(PractitionerGender)
  practitionerGender?: PractitionerGender | null;

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

  @ApiPropertyOptional({ minimum: 0, maximum: 80 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsOfExperience?: number | null;

  @ApiPropertyOptional({
    description: 'ISO country code',
  })
  @IsOptional()
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Za-z]{2,3}$/)
  countryCode?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'Lowercase language codes like ar/en',
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
    description:
      'When null, clears payout destination. When provided, validates and upserts.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerPayoutDestinationInputDto)
  payoutDestination?: PractitionerPayoutDestinationInputDto | null;
}
