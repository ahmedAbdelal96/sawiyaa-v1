import { Injectable } from '@nestjs/common';

/**
 * Generates numeric OTP codes with a configurable length.
 */
@Injectable()
export class OtpCodeGeneratorService {
  generate(length: number): string {
    const digits = Array.from({ length }, () =>
      Math.floor(Math.random() * 10).toString(),
    );
    return digits.join('');
  }
}
