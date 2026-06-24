export type SettingsLocale = "ar" | "en";

export type SettingsNotificationChannel = "IN_APP" | "EMAIL";

export interface SettingsPreferences {
  locale: SettingsLocale | null;
  timezone: string | null;
}

export interface SettingsNotificationPreferenceItem {
  typeSlug: string;
  channel: SettingsNotificationChannel;
  enabled: boolean;
}

export interface SettingsNotificationPreferences {
  items: SettingsNotificationPreferenceItem[];
  supportedChannels: SettingsNotificationChannel[];
  isPersisted: boolean;
  updatedAt: string | null;
}

export interface SettingsOwnership {
  ownedSurfaces: string[];
  outOfScopeSurfaces: string[];
}

export interface SettingsItem {
  preferences: SettingsPreferences;
  notificationPreferences: SettingsNotificationPreferences;
  ownership: SettingsOwnership;
}

export interface SettingsResponse {
  item: SettingsItem;
}

export interface PatchSettingsPreferencesPayload {
  locale?: SettingsLocale;
  timezone?: string;
}

export interface PutNotificationPreferencesPayload {
  items: SettingsNotificationPreferenceItem[];
}
