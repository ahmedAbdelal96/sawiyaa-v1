import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Weekly schedule replacement is full-state, not patch-based.
 * This keeps the write path deterministic and avoids partially stale recurring slots.
 */
export class WeeklyAvailabilitySlotInputDto {
  @ApiProperty({
    minimum: 0,
    maximum: 6,
    description: '0 = Sunday, 6 = Saturday',
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    minimum: 0,
    maximum: 1439,
    description:
      'Start minute in practitioner timezone, counted from local midnight',
  })
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinuteOfDay!: number;

  @ApiProperty({
    minimum: 1,
    maximum: 1440,
    description:
      'End minute in practitioner timezone, counted from local midnight',
  })
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinuteOfDay!: number;
}

export class ReplaceWeeklyAvailabilityDto {
  @ApiProperty({
    example: 'Africa/Cairo',
    description:
      'IANA timezone that defines how recurring weekly slots are interpreted',
  })
  @IsString()
  @MaxLength(50)
  timezone!: string;

  @ApiProperty({
    type: WeeklyAvailabilitySlotInputDto,
    isArray: true,
    description:
      'Complete recurring weekly schedule that will replace existing active slots',
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => WeeklyAvailabilitySlotInputDto)
  slots!: WeeklyAvailabilitySlotInputDto[];
}
