import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
