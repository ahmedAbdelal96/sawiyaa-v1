import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionMode } from '@prisma/client';
import { IsEnum, IsIn, IsISO8601, IsString, MaxLength } from 'class-validator';

/**
 * Scheduled session creation stays intentionally minimal in V1.
 * The patient chooses practitioner, start time, and duration; payment orchestration happens later.
 */
export class CreateScheduledSessionDto {
  @ApiProperty({
    example: 'dr-example',
    description: 'Public practitioner slug used by booking surfaces',
  })
  @IsString()
  @MaxLength(191)
  practitionerSlug!: string;

  @ApiProperty({
    example: '2026-04-10T10:00:00.000Z',
    description: 'Requested UTC session start datetime',
  })
  @IsISO8601()
  scheduledStartAt!: string;

  @ApiProperty({
    enum: [30, 60],
    example: 60,
  })
  @IsIn([30, 60])
  durationMinutes!: 30 | 60;

  @ApiPropertyOptional({
    enum: SessionMode,
    default: SessionMode.VIDEO,
    description: 'Optional consultation modality baseline',
  })
  @IsEnum(SessionMode)
  sessionMode: SessionMode = SessionMode.VIDEO;
}
