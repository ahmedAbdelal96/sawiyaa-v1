import { BadRequestException, Injectable } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import { normalizeIanaTimeZoneInput } from '@common/utils/timezone.util';
import {
  SETTINGS_ERROR_CODES,
  SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS,
  SettingsNotificationChannel,
} from '../types/settings.types';
import { PutMyNotificationPreferenceItemDto } from '../dto/settings.dto';

const NOTIFICATION_TYPE_SLUG_REGEX = /^[a-z0-9._-]{2,120}$/i;

@Injectable()
export class ValidateSettingsContractInputService {
  assertValidLocale(locale?: string | null): ContentLocale | undefined {
    if (locale === undefined || locale === null) {
      return undefined;
    }

    const normalized = locale.trim();
    const supportedLocales = new Set(Object.values(ContentLocale));

    if (!supportedLocales.has(normalized as ContentLocale)) {
      throw new BadRequestException({
        messageKey: 'settings.errors.invalidLocale',
        errorCode: SETTINGS_ERROR_CODES.invalidLocale,
      });
    }

    return normalized as ContentLocale;
  }

  assertValidTimezone(timezone?: string | null): string | undefined {
    const normalized = normalizeIanaTimeZoneInput(timezone, {
      messageKey: 'settings.errors.invalidTimezone',
      error: SETTINGS_ERROR_CODES.invalidTimezone,
    });

    if (normalized === null || normalized === undefined) {
      return undefined;
    }

    return normalized;
  }

  assertValidNotificationPreferenceItems(
    items: PutMyNotificationPreferenceItemDto[],
  ): Array<{
    typeSlug: string;
    channel: SettingsNotificationChannel;
    enabled: boolean;
  }> {
    const seenKeys = new Set<string>();

    return items.map((item) => {
      const typeSlug = item.typeSlug.trim();
      const channel = item.channel;

      if (!typeSlug || !NOTIFICATION_TYPE_SLUG_REGEX.test(typeSlug)) {
        throw new BadRequestException({
          messageKey: 'settings.errors.invalidNotificationType',
          errorCode: SETTINGS_ERROR_CODES.invalidNotificationType,
        });
      }

      if (!SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS.includes(channel)) {
        throw new BadRequestException({
          messageKey: 'settings.errors.invalidNotificationChannel',
          errorCode: SETTINGS_ERROR_CODES.invalidNotificationChannel,
        });
      }

      const dedupeKey = `${typeSlug}::${channel}`;
      if (seenKeys.has(dedupeKey)) {
        throw new BadRequestException({
          messageKey: 'settings.errors.duplicateNotificationPreference',
          errorCode: SETTINGS_ERROR_CODES.duplicateNotificationPreference,
        });
      }
      seenKeys.add(dedupeKey);

      return {
        typeSlug,
        channel,
        enabled: item.enabled,
      };
    });
  }
}
