import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionMode } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Instant booking create payload stays intentionally small.
 * V1 accepts practitioner slug, duration, and a limited modality baseline only.
 */
export class CreateInstantBookingRequestDto {
  @ApiProperty({
    example: 'dr-example',
    description:
      'Public practitioner slug used by patient instant-booking surfaces',
  })
  @IsString()
  @MaxLength(191)
  practitionerSlug!: string;

  @ApiProperty({ enum: [30, 60], example: 30 })
  @IsIn([30, 60])
  durationMinutes!: 30 | 60;

  @ApiPropertyOptional({
    enum: [SessionMode.VIDEO, SessionMode.AUDIO],
    default: SessionMode.VIDEO,
  })
  @IsOptional()
  @IsIn([SessionMode.VIDEO, SessionMode.AUDIO])
  sessionMode?: SessionMode;
}
