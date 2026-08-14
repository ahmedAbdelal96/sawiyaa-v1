import { Platform } from 'react-native';

export const PRODUCTION_API_URL = 'https://sawiyaa.com/api/v1';

// Keep every Expo public environment access static so Metro can inline it for native releases.
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

type ResolveOptions = {
  configuredUrl?: string;
  isDevelopment?: boolean;
  platform?: 'android' | 'ios' | 'web';
};

function assertAbsoluteUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL must be a valid absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_URL must use http:// or https://.');
  }

  return value.replace(/\/$/, '');
}

export function resolveMobileApiUrl({
  configuredUrl,
  isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__,
  platform = Platform.OS as ResolveOptions['platform'],
}: ResolveOptions = {}): string {
  const configured = configuredUrl?.trim();
  if (configured) {
    const resolved = assertAbsoluteUrl(configured);
    if (!isDevelopment && !resolved.startsWith('https://')) {
      throw new Error('EXPO_PUBLIC_API_URL must use https:// in production builds.');
    }
    return resolved;
  }

  if (!isDevelopment) {
    return PRODUCTION_API_URL;
  }

  if (platform === 'android') {
    return 'http://10.0.2.2:7000/api/v1';
  }

  return 'http://localhost:7000/api/v1';
}

// Keep this access static so Expo/Metro can inline an EAS or local build value.
export const MOBILE_API_URL = resolveMobileApiUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
});
