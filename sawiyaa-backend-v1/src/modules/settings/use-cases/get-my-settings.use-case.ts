import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ContentLocale } from '@prisma/client';
import {
  SETTINGS_DEFAULT_LOCALE,
  SETTINGS_DEFAULT_TIMEZONE,
  SETTINGS_ERROR_CODES,
  SETTINGS_OWNERSHIP,
} from '../types/settings.types';
import { SettingsRepository } from '../repositories/settings.repository';
import { GetMySettingsNotificationPreferencesUseCase } from './get-my-settings-notification-preferences.use-case';

@Injectable()
export class GetMySettingsUseCase {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly getMySettingsNotificationPreferencesUseCase: GetMySettingsNotificationPreferencesUseCase,
  ) {}

  async execute(authenticatedUser: AuthenticatedUser) {
    const userPreferences = await this.settingsRepository.findUserPreferences(
      authenticatedUser.id,
    );

    if (!userPreferences) {
      throw new NotFoundException({
        messageKey: 'settings.errors.settingsOwnerNotFound',
        errorCode: SETTINGS_ERROR_CODES.settingsOwnerNotFound,
      });
    }

    const notificationPreferences =
      await this.getMySettingsNotificationPreferencesUseCase.execute(
        authenticatedUser,
      );

    return {
      item: {
        preferences: {
          locale:
            (userPreferences.defaultLocale as ContentLocale | null) ??
            SETTINGS_DEFAULT_LOCALE,
          timezone: userPreferences.timezone ?? SETTINGS_DEFAULT_TIMEZONE,
        },
        notificationPreferences: notificationPreferences.item,
        ownership: {
          ownedSurfaces: [...SETTINGS_OWNERSHIP.ownedSurfaces],
          outOfScopeSurfaces: [...SETTINGS_OWNERSHIP.outOfScopeSurfaces],
        },
      },
    };
  }
}
