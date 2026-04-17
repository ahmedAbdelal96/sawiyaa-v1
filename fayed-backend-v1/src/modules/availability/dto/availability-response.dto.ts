import { ApiProperty } from '@nestjs/swagger';
import {
  AvailabilityExceptionSource,
  AvailabilityExceptionType,
  AvailabilityWeekday,
} from '@prisma/client';

export class WeeklyAvailabilitySlotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ minimum: 0, maximum: 6 })
  dayOfWeek!: number;

  @ApiProperty({ enum: AvailabilityWeekday })
  weekday!: AvailabilityWeekday;

  @ApiProperty()
  startMinuteOfDay!: number;

  @ApiProperty()
  endMinuteOfDay!: number;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true })
  effectiveFrom!: string | null;

  @ApiProperty({ nullable: true })
  effectiveTo!: string | null;
}

export class AvailabilityExceptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AvailabilityExceptionType })
  type!: AvailabilityExceptionType;

  @ApiProperty()
  startsAt!: string;

  @ApiProperty()
  endsAt!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ enum: AvailabilityExceptionSource })
  source!: AvailabilityExceptionSource;

  @ApiProperty()
  isActive!: boolean;
}

export class AvailabilityWindowResponseDto {
  @ApiProperty()
  startsAt!: string;

  @ApiProperty()
  endsAt!: string;
}

export class MyAvailabilityDataResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: WeeklyAvailabilitySlotResponseDto, isArray: true })
  weeklySlots!: WeeklyAvailabilitySlotResponseDto[];

  @ApiProperty({ type: AvailabilityExceptionResponseDto, isArray: true })
  exceptions!: AvailabilityExceptionResponseDto[];
}

export class AvailabilityMutationDataResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: WeeklyAvailabilitySlotResponseDto, isArray: true })
  weeklySlots!: WeeklyAvailabilitySlotResponseDto[];

  @ApiProperty({ type: AvailabilityExceptionResponseDto, isArray: true })
  exceptions!: AvailabilityExceptionResponseDto[];
}

export class PublicPractitionerAvailabilityDataResponseDto {
  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: WeeklyAvailabilitySlotResponseDto, isArray: true })
  weeklySlots!: WeeklyAvailabilitySlotResponseDto[];
}

export class PublicAvailabilityRangeResponseDto {
  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;
}

export class PublicPractitionerAvailabilityWindowsDataResponseDto {
  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: PublicAvailabilityRangeResponseDto })
  range!: PublicAvailabilityRangeResponseDto;

  @ApiProperty({ type: AvailabilityWindowResponseDto, isArray: true })
  windows!: AvailabilityWindowResponseDto[];
}

export class MyAvailabilitySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: MyAvailabilityDataResponseDto })
  data!: MyAvailabilityDataResponseDto;
}

export class AvailabilityMutationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AvailabilityMutationDataResponseDto })
  data!: AvailabilityMutationDataResponseDto;
}

export class PublicPractitionerAvailabilitySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerAvailabilityDataResponseDto })
  data!: PublicPractitionerAvailabilityDataResponseDto;
}

export class PublicPractitionerAvailabilityWindowsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerAvailabilityWindowsDataResponseDto })
  data!: PublicPractitionerAvailabilityWindowsDataResponseDto;
}
