import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Phase 1 profile updates stay intentionally small.
 * Fields here cover only baseline patient identity and preference data plus optional onboarding completion.
 */
export class UpdatePatientProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Date-only ISO string such as 1995-08-14',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gender?: string | null;

  @ApiPropertyOptional({ enum: ['ar', 'en'] })
  @IsOptional()
  @IsString()
  @Matches(/^(ar|en)$/)
  locale?: string;

  @ApiPropertyOptional({
    description: 'Active country ISO code stored against the patient profile',
  })
  @IsOptional()
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Za-z]{2,3}$/)
  countryCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description:
      'When true, the module will attempt to mark onboarding as completed after applying the profile updates.',
  })
  @IsOptional()
  @IsBoolean()
  completeOnboarding?: boolean;
}
