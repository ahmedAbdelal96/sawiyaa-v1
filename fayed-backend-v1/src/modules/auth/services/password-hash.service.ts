import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

/**
 * PasswordHashService is the low-level hashing utility for passwords and stored refresh-token hashes.
 * Use cases call dedicated wrappers so higher-level auth flows remain explicit.
 */
@Injectable()
export class PasswordHashService {
  constructor(private readonly configService: ConfigService) {}

  async hash(value: string): Promise<string> {
    const saltRounds = this.configService.get<number>('auth.password.saltRounds', 12);
    return bcrypt.hash(value, saltRounds);
  }

  async verify(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
