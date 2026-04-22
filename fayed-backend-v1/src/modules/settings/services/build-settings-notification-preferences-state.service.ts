import { Injectable } from '@nestjs/common';
import {
  SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS,
  SettingsNotificationChannel,
} from '../types/settings.types';

type AvailableNotificationType = {
  id: string;
  slug: string;
  defaultEnabled: boolean;
  supportsEmail: boolean;
  supportsInApp: boolean;
};

type PersistedPreference = {
  notificationTypeId: string;
  channel: string;
  isEnabled: boolean;
  updatedAt: Date;
};

@Injectable()
export class BuildSettingsNotificationPreferencesStateService {
  build(input: {
    availableTypes: AvailableNotificationType[];
    persistedRows: PersistedPreference[];
  }) {
    const persistedByTypeAndChannel = new Map<string, PersistedPreference>();
    for (const row of input.persistedRows) {
      persistedByTypeAndChannel.set(
        this.buildKey(row.notificationTypeId, row.channel),
        row,
      );
    }

    const items = input.availableTypes
      .flatMap((type) => {
        const supportedChannels = this.resolveSupportedChannels(type);

        return supportedChannels.map((channel) => {
          const persisted = persistedByTypeAndChannel.get(
            this.buildKey(type.id, channel),
          );

          return {
            typeSlug: type.slug,
            channel,
            enabled: persisted?.isEnabled ?? type.defaultEnabled,
          };
        });
      })
      .sort((left, right) => {
        if (left.typeSlug !== right.typeSlug) {
          return left.typeSlug.localeCompare(right.typeSlug);
        }

        return left.channel.localeCompare(right.channel);
      });

    const lastUpdatedAt =
      input.persistedRows.length > 0
        ? input.persistedRows
            .map((row) => row.updatedAt)
            .reduce((latest, current) =>
              current.getTime() > latest.getTime() ? current : latest,
            )
        : null;

    return {
      items,
      supportedChannels: [...SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS],
      isPersisted: input.persistedRows.length > 0,
      updatedAt: lastUpdatedAt?.toISOString() ?? null,
    };
  }

  private resolveSupportedChannels(type: AvailableNotificationType) {
    const channels: SettingsNotificationChannel[] = [];

    if (type.supportsInApp) {
      channels.push('IN_APP');
    }

    if (type.supportsEmail) {
      channels.push('EMAIL');
    }

    return channels;
  }

  private buildKey(typeId: string, channel: string) {
    return `${typeId}::${channel}`;
  }
}
