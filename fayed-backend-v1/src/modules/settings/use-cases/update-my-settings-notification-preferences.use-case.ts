import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SETTINGS_ERROR_CODES } from '../types/settings.types';
import {
  PutMyNotificationPreferenceItemDto,
  PutMyNotificationPreferencesDto,
} from '../dto/settings.dto';
import { ValidateSettingsContractInputService } from '../services/validate-settings-contract-input.service';
import { SettingsRepository } from '../repositories/settings.repository';
import { BuildSettingsNotificationPreferencesStateService } from '../services/build-settings-notification-preferences-state.service';

@Injectable()
export class UpdateMySettingsNotificationPreferencesUseCase {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly validateSettingsContractInputService: ValidateSettingsContractInputService,
    private readonly buildSettingsNotificationPreferencesStateService: BuildSettingsNotificationPreferencesStateService,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    dto: PutMyNotificationPreferencesDto;
  }) {
    const owner = await this.settingsRepository.findUserPreferences(
      input.authenticatedUser.id,
    );

    if (!owner) {
      throw new NotFoundException({
        messageKey: 'settings.errors.settingsOwnerNotFound',
        errorCode: SETTINGS_ERROR_CODES.settingsOwnerNotFound,
      });
    }

    const normalizedItems =
      this.validateSettingsContractInputService.assertValidNotificationPreferenceItems(
        input.dto.items as PutMyNotificationPreferenceItemDto[],
      );

    const availableTypes = await this.settingsRepository.findNotificationTypesBySlugs(
      [...new Set(normalizedItems.map((item) => item.typeSlug))],
    );
    const typeBySlug = new Map(availableTypes.map((type) => [type.slug, type]));

    if (typeBySlug.size !== new Set(normalizedItems.map((item) => item.typeSlug)).size) {
      throw new BadRequestException({
        messageKey: 'settings.errors.invalidNotificationType',
        errorCode: SETTINGS_ERROR_CODES.invalidNotificationType,
      });
    }

    const upsertItems = normalizedItems.map((item) => {
      const type = typeBySlug.get(item.typeSlug);
      if (!type) {
        throw new BadRequestException({
          messageKey: 'settings.errors.invalidNotificationType',
          errorCode: SETTINGS_ERROR_CODES.invalidNotificationType,
        });
      }

      const channelSupported =
        (item.channel === 'IN_APP' && type.supportsInApp) ||
        (item.channel === 'EMAIL' && type.supportsEmail);

      if (!channelSupported) {
        throw new BadRequestException({
          messageKey: 'settings.errors.invalidNotificationChannel',
          errorCode: SETTINGS_ERROR_CODES.invalidNotificationChannel,
        });
      }

      return {
        notificationTypeId: type.id,
        channel: item.channel as NotificationChannel,
        enabled: item.enabled,
      };
    });

    await this.settingsRepository.upsertUserNotificationPreferences({
      userId: input.authenticatedUser.id,
      items: upsertItems,
    });

    const [allTypes, persistedRows] = await Promise.all([
      this.settingsRepository.listAvailableNotificationTypes(),
      this.settingsRepository.listUserNotificationPreferences(
        input.authenticatedUser.id,
      ),
    ]);

    return {
      item: this.buildSettingsNotificationPreferencesStateService.build({
        availableTypes: allTypes,
        persistedRows,
      }),
    };
  }
}
