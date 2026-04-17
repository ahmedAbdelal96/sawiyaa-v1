import { Injectable } from '@nestjs/common';
import { PasswordHashService } from '../services/password-hash.service';

/**
 * Password verification is kept as a use case so login flows read clearly and stay mockable in tests.
 */
@Injectable()
export class VerifyPasswordUseCase {
  constructor(private readonly passwordHashService: PasswordHashService) {}

  execute(password: string, passwordHash: string): Promise<boolean> {
    return this.passwordHashService.verify(password, passwordHash);
  }
}
