import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigRuntimeService } from '@modules/config/services/config-runtime.service';

@Injectable()
export class InstantBookingPolicyService {
  constructor(private readonly config: ConfigRuntimeService) {}

  async requestTtlMinutes(): Promise<number> {
    return this.get('INSTANT_BOOKING_REQUEST_TTL_MINUTES');
  }

  async paymentWindowMinutes(): Promise<number> {
    return this.get('INSTANT_BOOKING_PAYMENT_WINDOW_MINUTES');
  }

  private async get(key: 'INSTANT_BOOKING_REQUEST_TTL_MINUTES' | 'INSTANT_BOOKING_PAYMENT_WINDOW_MINUTES') {
    const value = await this.config.getNumber(key);
    if (value === null || !Number.isInteger(value) || value < 1 || value > 30) {
      throw new InternalServerErrorException(`Invalid Instant Booking policy: ${key}`);
    }
    return value;
  }
}
