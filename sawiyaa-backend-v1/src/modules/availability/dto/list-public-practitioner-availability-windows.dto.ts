import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

/**
 * Public window reads require an explicit UTC range to avoid vague "next available" semantics in V1.
 * Sessions and booking will later build on top of these deterministic windows.
 */
export class ListPublicPractitionerAvailabilityWindowsDto {
  @ApiProperty({
    example: '2026-04-01T00:00:00Z',
    description: 'Inclusive UTC range start',
  })
  @IsISO8601()
  from!: string;

  @ApiProperty({
    example: '2026-04-07T23:59:59Z',
    description: 'Exclusive UTC range end',
  })
  @IsISO8601()
  to!: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'When true, include public-safe booked/reserved occupied slots for schedule rendering',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeBooked?: boolean;
}
