import { ContentLocale } from '@prisma/client';

export const SETTINGS_DEFAULT_LOCALE: ContentLocale = ContentLocale.ar;
export const SETTINGS_DEFAULT_TIMEZONE = 'Africa/Cairo';

export const SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS = [
  'IN_APP',
  'EMAIL',
  'PUSH',
] as const;

export type SettingsNotificationChannel =
  (typeof SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS)[number];

export const SETTINGS_OWNERSHIP = {
  ownedSurfaces: [
    'USER_LOCALE_PREFERENCE',
    'USER_TIMEZONE_PREFERENCE',
    'USER_NOTIFICATION_PREFERENCE_STATE',
  ] as const,
  outOfScopeSurfaces: [
    'USER_PROFILE_EDITING',
    'PRACTITIONER_PROFILE_EDITING',
    'PATIENT_PROFILE_EDITING',
    'NOTIFICATION_DELIVERY_RUNTIME',
    'AUTH_SECURITY_MUTATION_FLOWS',
    'INTERNAL_CONFIG_ENV_VALUES',
    'GENERAL_CHAT_PREFERENCES',
  ] as const,
} as const;

export const SETTINGS_ERROR_CODES = {
  invalidLocale: 'SETTINGS_INVALID_LOCALE',
  invalidTimezone: 'SETTINGS_INVALID_TIMEZONE',
  invalidNotificationType: 'SETTINGS_INVALID_NOTIFICATION_TYPE',
  invalidNotificationChannel: 'SETTINGS_INVALID_NOTIFICATION_CHANNEL',
  duplicateNotificationPreference: 'SETTINGS_DUPLICATE_NOTIFICATION_PREFERENCE',
  settingsOwnerNotFound: 'SETTINGS_OWNER_NOT_FOUND',
} as const;
