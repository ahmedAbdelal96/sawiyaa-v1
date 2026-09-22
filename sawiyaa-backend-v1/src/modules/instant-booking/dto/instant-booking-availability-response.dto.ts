import { ApiProperty } from '@nestjs/swagger';

export class InstantBookingAvailabilityDurationsDto {
  @ApiProperty()
  '30'!: boolean;

  @ApiProperty()
  '60'!: boolean;
}

export class InstantBookingAvailabilityResponseDto {
  @ApiProperty()
  availableNow!: boolean;

  @ApiProperty({ type: InstantBookingAvailabilityDurationsDto })
  durations!: InstantBookingAvailabilityDurationsDto;

  @ApiProperty()
  checkedAt!: string;
}
