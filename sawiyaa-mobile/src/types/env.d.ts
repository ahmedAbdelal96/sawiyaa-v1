declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_WEB_APP_URL?: string;
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
    /**
     * Practitioner login OTP feature toggle (UI hint only).
     * Backend is the source of truth; this flag only controls UI copy/expectations.
     * Defaults to true when unset.
     */
    EXPO_PUBLIC_PRACTITIONER_LOGIN_OTP_ENABLED?: 'true' | 'false';
  }
}
