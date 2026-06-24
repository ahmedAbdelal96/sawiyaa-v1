import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ContentLocale } from '@prisma/client';
import {
  SETTINGS_DEFAULT_LOCALE,
  SETTINGS_DEFAULT_TIMEZONE,
  SETTINGS_ERROR_CODES,
} from '../types/settings.types';
import { PatchMySettingsPreferencesDto } from '../dto/settings.dto';
import { SettingsRepository } from '../repositories/settings.repository';
import { ValidateSettingsContractInputService } from '../services/validate-settings-contract-input.service';

@Injectable()
export class UpdateMySettingsPreferencesUseCase {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly validateSettingsContractInputService: ValidateSettingsContractInputService,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    dto: PatchMySettingsPreferencesDto;
  }) {
    const userPreferences = await this.settingsRepository.findUserPreferences(
      input.authenticatedUser.id,
    );

    if (!userPreferences) {
      throw new NotFoundException({
        messageKey: 'settings.errors.settingsOwnerNotFound',
        errorCode: SETTINGS_ERROR_CODES.settingsOwnerNotFound,
      });
    }

    const locale = this.validateSettingsContractInputService.assertValidLocale(
      input.dto.locale,
    );
    const timezone =
      this.validateSettingsContractInputService.assertValidTimezone(
        input.dto.timezone,
      );

    const nextLocale = (locale ??
      userPreferences.defaultLocale ??
      SETTINGS_DEFAULT_LOCALE) as ContentLocale;
    const nextTimezone =
      timezone ?? userPreferences.timezone ?? SETTINGS_DEFAULT_TIMEZONE;

    const shouldPersist =
      input.dto.locale !== undefined || input.dto.timezone !== undefined;

    const persistedPreferences = shouldPersist
      ? await this.settingsRepository.updateUserPreferences({
          userId: input.authenticatedUser.id,
          locale: nextLocale,
          timezone: nextTimezone,
        })
      : {
          defaultLocale: nextLocale,
          timezone: nextTimezone,
        };

    return {
      item: {
        locale: persistedPreferences.defaultLocale as ContentLocale,
        timezone: persistedPreferences.timezone,
      },
    };
  }
}
