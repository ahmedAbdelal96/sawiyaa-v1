import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';

/**
 * OTP hashes are stored instead of raw codes to avoid leaking usable secrets.
 */
@Injectable()
export class OtpHashService {
  hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
