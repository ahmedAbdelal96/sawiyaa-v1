import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import {
  AvailabilityWeekReminderState,
  AvailabilityWeekUiStatus,
} from '../types/availability-week.types';

const AVAILABILITY_WEEK_UI_STATUSES: AvailabilityWeekUiStatus[] = [
  'NOT_SET',
  AvailabilityWeekStatus.DRAFT,
  AvailabilityWeekStatus.PUBLISHED,
  AvailabilityWeekStatus.ARCHIVED,
];

export class AvailabilityWeekSlotInputDto {
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
    enum: [30, 60],
    default: 30,
    required: false,
    description: 'Slot duration in minutes',
  })
  @IsOptional()
  @IsInt()
  @IsIn([30, 60])
  durationMinutes?: 30 | 60;

  @ApiProperty({
    minimum: 0,
    maximum: 1439,
    description: 'Start minute in practitioner timezone from local midnight',
  })
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinuteOfDay!: number;

  @ApiProperty({
    minimum: 1,
    maximum: 1440,
    description: 'End minute in practitioner timezone from local midnight',
  })
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinuteOfDay!: number;
}

export class CreateAvailabilityWeekDto {
  @ApiProperty({
    example: '2026-06-21',
    description: 'Week start date in YYYY-MM-DD format. Must be Sunday.',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStartDate!: string;

  @ApiProperty({
    example: 'Africa/Cairo',
    description:
      'IANA timezone used to interpret the week boundary and slot wall-clock times',
  })
  @IsString()
  @MaxLength(50)
  timezone!: string;

  @ApiProperty({
    type: AvailabilityWeekSlotInputDto,
    isArray: true,
    required: false,
    description: 'Optional draft slots to seed the new week',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWeekSlotInputDto)
  slots?: AvailabilityWeekSlotInputDto[];
}

export class UpdateAvailabilityWeekDto {
  @ApiPropertyOptional({
    example: 'Africa/Cairo',
    description: 'Updated IANA timezone for the draft week',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    type: AvailabilityWeekSlotInputDto,
    isArray: true,
    description: 'Draft slots to replace for the week',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWeekSlotInputDto)
  slots?: AvailabilityWeekSlotInputDto[];
}

export class AvailabilityWeekSlotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ minimum: 0, maximum: 6 })
  dayOfWeek!: number;

  @ApiProperty({ enum: AvailabilityWeekday })
  weekday!: AvailabilityWeekday;

  @ApiProperty({ minimum: 0, maximum: 1439 })
  startMinuteOfDay!: number;

  @ApiProperty({ minimum: 1, maximum: 1440 })
  endMinuteOfDay!: number;

  @ApiProperty({ enum: [30, 60] })
  durationMinutes!: number;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AvailabilityWeekResponseDto {
  @ApiProperty({ nullable: true })
  id!: string | null;

  @ApiProperty()
  weekStartDate!: string;

  @ApiProperty()
  weekEndDate!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ enum: AVAILABILITY_WEEK_UI_STATUSES })
  status!: AvailabilityWeekUiStatus;

  @ApiProperty({ nullable: true })
  copiedFromWeekId!: string | null;

  @ApiProperty({ nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ nullable: true })
  createdAt!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;

  @ApiProperty()
  isEditable!: boolean;

  @ApiProperty()
  hasSlots!: boolean;

  @ApiProperty({ type: AvailabilityWeekSlotResponseDto, isArray: true })
  slots!: AvailabilityWeekSlotResponseDto[];
}

export class AvailabilityWeekOverviewDataResponseDto {
  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: AvailabilityWeekResponseDto })
  currentWeek!: AvailabilityWeekResponseDto;

  @ApiProperty({ type: AvailabilityWeekResponseDto })
  nextWeek!: AvailabilityWeekResponseDto;

  @ApiProperty({ enum: ['NONE', 'CURRENT_WEEK_MISSING', 'NEXT_WEEK_MISSING', 'DRAFT_EXISTS'] })
  reminderState!: AvailabilityWeekReminderState;

  @ApiProperty()
  shouldPromptForNextWeek!: boolean;

  @ApiProperty({ nullable: true })
  daysUntilCurrentWeekEnds!: number | null;

  @ApiProperty()
  nextWeekPublished!: boolean;
}

export class AvailabilityWeekMutationDataResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: AvailabilityWeekResponseDto })
  week!: AvailabilityWeekResponseDto;

  @ApiProperty({ type: AvailabilityWeekResponseDto })
  currentWeek!: AvailabilityWeekResponseDto;

  @ApiProperty({ type: AvailabilityWeekResponseDto })
  nextWeek!: AvailabilityWeekResponseDto;

  @ApiProperty({ enum: ['NONE', 'CURRENT_WEEK_MISSING', 'NEXT_WEEK_MISSING', 'DRAFT_EXISTS'] })
  reminderState!: AvailabilityWeekReminderState;

  @ApiProperty()
  shouldPromptForNextWeek!: boolean;

  @ApiProperty({ nullable: true })
  daysUntilCurrentWeekEnds!: number | null;

  @ApiProperty()
  nextWeekPublished!: boolean;
}

export class AvailabilityWeekOverviewSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AvailabilityWeekOverviewDataResponseDto })
  data!: AvailabilityWeekOverviewDataResponseDto;
}

export class AvailabilityWeekMutationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AvailabilityWeekMutationDataResponseDto })
  data!: AvailabilityWeekMutationDataResponseDto;
}
