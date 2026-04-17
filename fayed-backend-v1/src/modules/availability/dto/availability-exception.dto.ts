import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AvailabilityExceptionType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Exception DTOs model concrete UTC windows only.
 * Weekly recurring patterns remain in weekly slots, while temporary overrides live here.
 */
export class CreateAvailabilityExceptionDto {
  @ApiProperty({
    enum: AvailabilityExceptionType,
    description: 'BLOCK removes availability, OPEN_EXTRA adds extra temporary availability',
  })
  @IsEnum(AvailabilityExceptionType)
  type!: AvailabilityExceptionType;

  @ApiProperty({
    example: '2026-04-10T09:00:00Z',
    description: 'UTC start datetime',
  })
  @IsISO8601()
  startsAt!: string;

  @ApiProperty({
    example: '2026-04-10T14:00:00Z',
    description: 'UTC end datetime',
  })
  @IsISO8601()
  endsAt!: string;

  @ApiPropertyOptional({
    example: 'personal',
    description: 'Optional practitioner-facing note. This is never exposed on public read APIs.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateAvailabilityExceptionDto extends PartialType(
  CreateAvailabilityExceptionDto,
) {}
