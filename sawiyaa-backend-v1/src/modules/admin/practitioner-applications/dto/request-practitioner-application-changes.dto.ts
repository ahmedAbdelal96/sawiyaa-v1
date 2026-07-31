import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialType, ReviewOperationalImpact, ReviewRequirementSeverity, ReviewSection } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class PractitionerReviewRequirementDto {
  @ApiProperty({ enum: ReviewSection })
  @IsEnum(ReviewSection)
  section!: ReviewSection;

  @ApiPropertyOptional({ description: 'Stable field path used for deduplication' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  fieldPath?: string;

  @ApiPropertyOptional({ enum: CredentialType })
  @IsOptional()
  @IsEnum(CredentialType)
  credentialType?: CredentialType;

  @ApiProperty({ maxLength: 191 })
  @IsString()
  @MaxLength(191)
  title!: string;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ enum: ReviewRequirementSeverity })
  @IsOptional()
  @IsEnum(ReviewRequirementSeverity)
  severity?: ReviewRequirementSeverity;

  @ApiPropertyOptional({ enum: ReviewOperationalImpact, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ReviewOperationalImpact, { each: true })
  operationalImpact?: ReviewOperationalImpact[];
}

/**
 * Admin request-changes DTO.
 * Reason is required so the practitioner understands what to update before resubmission.
 */
export class RequestPractitionerApplicationChangesDto {
  @ApiProperty({
    description: 'Changes request reason shown to the practitioner',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Optional internal/explanatory note kept alongside the decision',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ type: [PractitionerReviewRequirementDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PractitionerReviewRequirementDto)
  requirements?: PractitionerReviewRequirementDto[];
}
