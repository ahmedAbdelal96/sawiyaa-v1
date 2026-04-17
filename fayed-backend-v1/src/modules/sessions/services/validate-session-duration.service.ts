import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class ValidateSessionDurationService {
  private readonly allowedDurations = new Set([30, 60]);

  validate(durationMinutes: number): void {
    if (!this.allowedDurations.has(durationMinutes)) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidDuration',
        error: 'SESSION_INVALID_DURATION',
      });
    }
  }
}
