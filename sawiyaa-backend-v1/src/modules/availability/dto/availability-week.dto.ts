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
import { AvailabilityWeekUiStatus } from '../types/availability-week.types';
import { AVAILABILITY_WEEK_MAX_SLOTS } from '../constants/availability-capacity.constants';

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
    description: 'Optional session times to seed the new weekly schedule',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(AVAILABILITY_WEEK_MAX_SLOTS, {
    message: 'availability.errors.weekSlotsLimit',
  })
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWeekSlotInputDto)
  slots?: AvailabilityWeekSlotInputDto[];
}

export class UpdateAvailabilityWeekDto {
  @ApiPropertyOptional({
    example: 'Africa/Cairo',
    description: 'Updated IANA timezone for the weekly schedule',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    type: AvailabilityWeekSlotInputDto,
    isArray: true,
    description: 'Session times to replace for the week',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(AVAILABILITY_WEEK_MAX_SLOTS, {
    message: 'availability.errors.weekSlotsLimit',
  })
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

export class AvailabilityWeekWindowEntryResponseDto {
  @ApiProperty({ nullable: true })
  weekId!: string | null;

  @ApiProperty()
  weekStartDate!: string;

  @ApiProperty()
  weekEndDate!: string;

  @ApiProperty({ enum: AVAILABILITY_WEEK_UI_STATUSES })
  status!: AvailabilityWeekUiStatus;

  @ApiProperty()
  isCurrentWeek!: boolean;

  @ApiProperty()
  relativeWeekIndex!: number;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canEdit!: boolean;

  @ApiProperty()
  canPublish!: boolean;

  @ApiProperty()
  containsBookings!: boolean;

  @ApiProperty()
  slotCount!: number;

  @ApiProperty()
  slotCount30Minutes!: number;

  @ApiProperty()
  slotCount60Minutes!: number;

  @ApiProperty({ nullable: true })
  copiedFromWeekId!: string | null;
}

export class AvailabilityRollingWindowDataResponseDto {
  @ApiProperty()
  timezone!: string;

  @ApiProperty({ enum: ['SUNDAY'] })
  weekStartsOn!: 'SUNDAY';

  @ApiProperty()
  futureWeeksAllowed!: number;

  @ApiProperty({ type: Object })
  activeRange!: {
    startWeekDate: string;
    endWeekDate: string;
  };

  @ApiProperty({ type: AvailabilityWeekWindowEntryResponseDto, isArray: true })
  weeks!: AvailabilityWeekWindowEntryResponseDto[];

}

export class AvailabilityRollingWindowSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AvailabilityRollingWindowDataResponseDto })
  data!: AvailabilityRollingWindowDataResponseDto;
}

export class AvailabilityWeekDetailsResponseDto {
  @ApiProperty({ type: AvailabilityWeekResponseDto })
  week!: AvailabilityWeekResponseDto;

  @ApiProperty()
  canPublish!: boolean;

  @ApiProperty()
  containsBookings!: boolean;

  @ApiProperty()
  slotCount30Minutes!: number;

  @ApiProperty()
  slotCount60Minutes!: number;
}

export class AvailabilityWeekMutationDataResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: AvailabilityWeekResponseDto })
  week!: AvailabilityWeekResponseDto;

  @ApiProperty({ type: AvailabilityWeekWindowEntryResponseDto, isArray: true })
  weeks!: AvailabilityWeekWindowEntryResponseDto[];
}

export class AvailabilityWeekMutationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AvailabilityWeekMutationDataResponseDto })
  data!: AvailabilityWeekMutationDataResponseDto;
}

export const AVAILABILITY_REPEAT_REASON_CODES = [
  'ELIGIBLE',
  'TARGET_ALREADY_EXISTS',
  'TARGET_PUBLISHED',
  'TARGET_HAS_BOOKINGS',
  'TARGET_CHANGED_SINCE_PREVIEW',
  'TARGET_OUT_OF_ACTIVE_RANGE',
  'TARGET_NOT_FUTURE',
  'TARGET_NOT_SUNDAY',
  'TARGET_EQUALS_SOURCE',
  'TARGET_DUPLICATED',
  'INVALID_TIMEZONE',
  'SOURCE_NOT_FOUND',
  'SOURCE_HAS_NO_SESSION_TIMES',
  'SOURCE_OUT_OF_ACTIVE_RANGE',
  'DST_INVALID_TIME',
  'DST_AMBIGUOUS_TIME',
  'SOURCE_CHANGED_SINCE_PREVIEW',
  'REPEAT_PREVIEW_EXPIRED',
  'IDEMPOTENCY_CONFLICT',
  'REPEAT_IN_PROGRESS',
] as const;

export type AvailabilityRepeatReasonCode = typeof AVAILABILITY_REPEAT_REASON_CODES[number];

export class RepeatAvailabilityWeekPreviewRequestDto {
  @ApiProperty({ type: String, isArray: true, example: ['2026-07-05', '2026-07-12'] })
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  targetWeekStartDates!: string[];

  @ApiProperty({ example: 'repeat-2026-07-01-abc123' })
  @IsString()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:-]{8,128}$/)
  idempotencyKey!: string;
}

export class RepeatAvailabilityWeekConfirmRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @Matches(/^[0-9a-f-]{36}$/i)
  operationId!: string;

  @ApiProperty({ example: 'repeat-2026-07-01-abc123' })
  @IsString()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:-]{8,128}$/)
  idempotencyKey!: string;
}

export class RepeatAvailabilityTargetResultDto {
  @ApiProperty()
  weekStartDate!: string;

  @ApiProperty({ enum: AVAILABILITY_REPEAT_REASON_CODES })
  reasonCode!: AvailabilityRepeatReasonCode;

  @ApiProperty({ enum: ['ELIGIBLE', 'SKIPPED', 'INVALID'] })
  classification!: 'ELIGIBLE' | 'SKIPPED' | 'INVALID';

  @ApiProperty()
  copiedSlotCount!: number;
}

export class RepeatAvailabilityWeekPreviewResponseDto {
  @ApiProperty()
  operationId!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty()
  sourceWeekId!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: Object })
  activeRange!: { startWeekDate: string; endWeekDate: string };

  @ApiProperty()
  sourceSlotCount30Minutes!: number;

  @ApiProperty()
  sourceSlotCount60Minutes!: number;

  @ApiProperty({ type: RepeatAvailabilityTargetResultDto, isArray: true })
  targets!: RepeatAvailabilityTargetResultDto[];

  @ApiProperty()
  confirmationAllowed!: boolean;
}

export class RepeatAvailabilityWeekConfirmResponseDto {
  @ApiProperty()
  operationId!: string;

  @ApiProperty({ enum: ['COMPLETED', 'FAILED', 'PROCESSING'] })
  status!: 'COMPLETED' | 'FAILED' | 'PROCESSING';

  @ApiProperty({ type: RepeatAvailabilityTargetResultDto, isArray: true })
  targets!: RepeatAvailabilityTargetResultDto[];

  @ApiProperty({ type: String, isArray: true })
  warnings!: string[];
}
