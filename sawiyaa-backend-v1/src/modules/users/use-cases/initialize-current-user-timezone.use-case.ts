import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { normalizeIanaTimeZoneInput } from '@common/utils/timezone.util';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class InitializeCurrentUserTimezoneUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    timezone: string;
  }) {
    const timezone = normalizeIanaTimeZoneInput(input.timezone, {
      messageKey: 'settings.errors.invalidTimezone',
      error: 'SETTINGS_INVALID_TIMEZONE',
    });

    if (!timezone) {
      throw new BadRequestException({
        messageKey: 'settings.errors.invalidTimezone',
        errorCode: 'SETTINGS_INVALID_TIMEZONE',
      });
    }

    const persisted = await this.userRepository.initializeTimezone({
      userId: input.authenticatedUser.id,
      timezone,
    });

    if (!persisted) {
      throw new NotFoundException({
        messageKey: 'users.errors.currentUserNotFound',
        error: 'CURRENT_USER_NOT_FOUND',
      });
    }

    return {
      timezone: persisted.user.timezone,
      initialized: persisted.initialized,
    };
  }
}
