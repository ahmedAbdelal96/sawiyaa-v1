import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordResetTokenService {
  constructor(private readonly configService: ConfigService) {}

  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    const pepper = this.configService.get<string>(
      'auth.passwordReset.tokenHashSecret',
      '',
    );

    return createHash('sha256').update(`${pepper}:${token}`).digest('hex');
  }

  getSessionTtlMinutes(): number {
    return this.configService.get<number>(
      'auth.passwordReset.sessionTtlMinutes',
      10,
    );
  }
}
