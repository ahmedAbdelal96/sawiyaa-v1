import { Injectable } from '@nestjs/common';
import { PasswordHashService } from '../services/password-hash.service';

/**
 * Dedicated wrapper around the hashing service so password hashing remains explicit in auth flows.
 */
@Injectable()
export class HashPasswordUseCase {
  constructor(private readonly passwordHashService: PasswordHashService) {}

  execute(password: string): Promise<string> {
    return this.passwordHashService.hash(password);
  }
}
