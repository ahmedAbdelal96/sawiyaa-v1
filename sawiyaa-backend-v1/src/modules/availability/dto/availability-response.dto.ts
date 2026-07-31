import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityWindowResponseDto {
  @ApiProperty()
  startsAt!: string;

  @ApiProperty()
  endsAt!: string;

  @ApiProperty({ enum: [30, 60], nullable: true, required: false })
  durationMinutes!: number | null;
}

export class PublicBookedSlotResponseDto {
  @ApiProperty()
  startsAt!: string;

  @ApiProperty()
  endsAt!: string;

  @ApiProperty({ enum: [30, 60], nullable: true, required: false })
  durationMinutes!: number | null;

  @ApiProperty({ enum: ['BOOKED', 'RESERVED'] })
  statusType!: 'BOOKED' | 'RESERVED';
}

export class PublicAvailabilityRangeResponseDto {
  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;
}

export class PublicPractitionerAvailabilityWindowsDataResponseDto {
  @ApiProperty({ example: true })
  acceptsNormalBookings!: boolean;

  @ApiProperty({ enum: ['NORMAL_BOOKINGS_PAUSED'], required: false })
  reasonCode?: 'NORMAL_BOOKINGS_PAUSED';

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: PublicAvailabilityRangeResponseDto })
  range!: PublicAvailabilityRangeResponseDto;

  @ApiProperty({ type: AvailabilityWindowResponseDto, isArray: true })
  windows!: AvailabilityWindowResponseDto[];

  @ApiProperty({
    type: PublicBookedSlotResponseDto,
    isArray: true,
    required: false,
  })
  bookedSlots?: PublicBookedSlotResponseDto[];
}

export class PublicPractitionerAvailabilityWindowsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerAvailabilityWindowsDataResponseDto })
  data!: PublicPractitionerAvailabilityWindowsDataResponseDto;
}
