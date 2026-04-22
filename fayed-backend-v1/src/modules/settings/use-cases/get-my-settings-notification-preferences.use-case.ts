import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SettingsRepository } from '../repositories/settings.repository';
import { SETTINGS_ERROR_CODES } from '../types/settings.types';
import { BuildSettingsNotificationPreferencesStateService } from '../services/build-settings-notification-preferences-state.service';

@Injectable()
export class GetMySettingsNotificationPreferencesUseCase {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly buildSettingsNotificationPreferencesStateService: BuildSettingsNotificationPreferencesStateService,
  ) {}

  async execute(authenticatedUser: AuthenticatedUser) {
    const owner = await this.settingsRepository.findUserPreferences(
      authenticatedUser.id,
    );

    if (!owner) {
      throw new NotFoundException({
        messageKey: 'settings.errors.settingsOwnerNotFound',
        errorCode: SETTINGS_ERROR_CODES.settingsOwnerNotFound,
      });
    }

    const [availableTypes, rows] = await Promise.all([
      this.settingsRepository.listAvailableNotificationTypes(),
      this.settingsRepository.listUserNotificationPreferences(
        authenticatedUser.id,
      ),
    ]);

    return {
      item: this.buildSettingsNotificationPreferencesStateService.build({
        availableTypes,
        persistedRows: rows,
      }),
    };
  }
}
