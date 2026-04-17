import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Admin approve DTO.
 * Note is optional and stored for baseline traceability in application.reviewNotes.
 */
export class ApprovePractitionerApplicationDto {
  @ApiPropertyOptional({
    description: 'Optional decision reason to store alongside the approval',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Optional admin note to keep alongside approval decision',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
