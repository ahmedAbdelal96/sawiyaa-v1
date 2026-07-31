import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePractitionerBookingSettingsDto {
  @ApiProperty({ description: 'Whether new normal scheduled bookings are accepted' })
  @IsBoolean()
  acceptsNormalBookings!: boolean;
}

export class PractitionerBookingSettingsSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  acceptsNormalBookings!: boolean;

  @ApiProperty()
  isInstantBookingEnabled!: boolean;
}
