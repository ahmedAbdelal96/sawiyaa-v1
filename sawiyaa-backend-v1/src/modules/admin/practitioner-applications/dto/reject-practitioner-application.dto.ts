import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Admin reject DTO.
 * Reject reason is required in Phase 1 to keep auditability and support clear practitioner feedback.
 */
export class RejectPractitionerApplicationDto {
  @ApiProperty({
    description: 'Primary rejection reason',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Optional internal/explanatory note kept alongside rejection',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
