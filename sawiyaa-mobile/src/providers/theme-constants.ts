export type ThemeMode = 'system' | 'light' | 'dark';
export const APP_THEME_STORAGE_KEY = 'sawiyaa.app.theme_mode';
export const DEFAULT_THEME_MODE: ThemeMode = 'light';

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveThemeMode(savedMode: string | null | undefined): ThemeMode {
  return isThemeMode(savedMode) ? savedMode : DEFAULT_THEME_MODE;
}
