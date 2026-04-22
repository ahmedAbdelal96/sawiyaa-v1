import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerType, SessionMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MatchingUrgencyPreference,
  PractitionerGenderPreference,
} from '../types/matching.types';

class MatchingBudgetRangeDto {
  @ApiPropertyOptional({
    description: 'Minimum session budget for the selected mode',
    example: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min?: number;

  @ApiPropertyOptional({
    description: 'Maximum session budget for the selected mode',
    example: 800,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max?: number;
}

export class CreateMatchingSessionDto {
  @ApiPropertyOptional({
    description:
      'Primary concern in natural language to help matching rationale',
    example: 'Anxiety and overthinking',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  primaryConcern?: string;

  @ApiPropertyOptional({
    description: 'Preferred specialty slug from specialties module',
    example: 'anxiety',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  preferredSpecialtySlug?: string;

  @ApiPropertyOptional({
    description: 'Preferred language code',
    example: 'ar',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2,10}$/i)
  preferredLanguage?: string;

  @ApiPropertyOptional({
    enum: PractitionerGenderPreference,
    example: PractitionerGenderPreference.ANY,
  })
  @IsOptional()
  @IsEnum(PractitionerGenderPreference)
  preferredPractitionerGender?: PractitionerGenderPreference;

  @ApiPropertyOptional({
    enum: [SessionMode.VIDEO, SessionMode.AUDIO],
    example: SessionMode.VIDEO,
  })
  @IsOptional()
  @IsIn([SessionMode.VIDEO, SessionMode.AUDIO])
  sessionMode?: SessionMode;

  @ApiPropertyOptional({
    enum: MatchingUrgencyPreference,
    example: MatchingUrgencyPreference.EARLIEST_AVAILABLE,
  })
  @IsOptional()
  @IsEnum(MatchingUrgencyPreference)
  urgency?: MatchingUrgencyPreference;

  @ApiPropertyOptional({ type: MatchingBudgetRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MatchingBudgetRangeDto)
  budgetRange?: MatchingBudgetRangeDto;

  @ApiPropertyOptional({
    description: 'Whether this is the first therapy journey for the patient',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  firstTimeInTherapy?: boolean;

  @ApiPropertyOptional({
    enum: PractitionerType,
    description: 'Optional provider type preference',
  })
  @IsOptional()
  @IsEnum(PractitionerType)
  preferredProviderType?: PractitionerType;

  @ApiPropertyOptional({
    description: 'Prefer candidates currently ready for instant booking',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  preferInstantBooking?: boolean;

  @ApiPropertyOptional({
    description: 'Optional country code hint for matching refinement',
    example: 'EG',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2,3}$/i)
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Optional timezone hint for future assessment/journey hooks',
    example: 'Africa/Cairo',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timezone?: string;
}
