export type SettingsLocale = "ar" | "en";

export type SettingsNotificationChannel = "IN_APP" | "EMAIL";

export interface MySettingsPreferences {
  locale: SettingsLocale | null;
  timezone: string | null;
}

export interface MySettingsNotificationPreferenceItem {
  typeSlug: string;
  channel: SettingsNotificationChannel;
  enabled: boolean;
}

export interface MySettingsNotificationPreferences {
  items: MySettingsNotificationPreferenceItem[];
  supportedChannels: SettingsNotificationChannel[];
  isPersisted: boolean;
  updatedAt: string | null;
}

export interface MySettingsOwnership {
  ownedSurfaces: string[];
  outOfScopeSurfaces: string[];
}

export interface MySettingsItem {
  preferences: MySettingsPreferences;
  notificationPreferences: MySettingsNotificationPreferences;
  ownership: MySettingsOwnership;
}

export interface MySettingsResponse {
  item: MySettingsItem;
}

export interface UpdateMySettingsPreferencesRequest {
  locale?: SettingsLocale;
  timezone?: string;
}

export interface UpdateMySettingsNotificationPreferencesRequest {
  items: MySettingsNotificationPreferenceItem[];
}
