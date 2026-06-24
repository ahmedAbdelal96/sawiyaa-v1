import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * Instant-booking readiness is intentionally separate from generic online/offline state.
 */
export class SetMyInstantBookingAvailabilityDto {
  @ApiProperty()
  @IsBoolean()
  isInstantBookingEnabled!: boolean;
}
