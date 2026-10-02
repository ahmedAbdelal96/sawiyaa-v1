import { CONFIG_DEFINITIONS } from './config.definitions';
import { deepFreeze } from './immutable';

export type ConfigKey =
  | 'auth.otp.loginTtlMinutes'
  | 'auth.passwordReset.otpTtlMinutes'
  | 'features.practitionerApplicationAdminReviewEnabled'
  | 'notifications.channels.default'
  | 'packages.enabled'
  | 'packages.purchaseEnabled'
  | 'payment.provider.paymob.allowedCountries'
  | 'payment.provider.paymob.checkoutFlow'
  | 'payment.provider.paymob.defaultMethod'
  | 'payment.provider.paymob.enabled'
  | 'payment.provider.paymob.maintenanceMode'
  | 'payment.provider.paymob.methodRegistry'
  | 'payment.provider.stripe.allowedCountries'
  | 'payment.provider.stripe.enabled'
  | 'payment.provider.stripe.maintenanceMode'
  | 'payment.routing.currencyRoutes'
  | 'payment.routing.defaultProvider'
  | 'payment.routing.fallbackProvider'
  | 'payment.routing.priorityOrder'
  | 'platform.defaultLocale'
  | 'security.jwt.accessTokenTtlMinutes'
  | 'finance.practitionerSharePercent.crossCountry'
  | 'finance.practitionerSharePercent.sameCountry'
  | 'INSTANT_BOOKING_PAYMENT_WINDOW_MINUTES'
  | 'INSTANT_BOOKING_REQUEST_TTL_MINUTES'
  | 'SESSION_EMAIL_REMINDERS_ENABLED'
  | 'SESSION_IN_APP_REMINDERS_ENABLED'
  | 'SESSION_JOIN_AFTER_END_GRACE_MINUTES'
  | 'SESSION_JOIN_EARLY_MINUTES'
  | 'SESSION_LATE_JOIN_REMINDER_ENABLED'
  | 'SESSION_LATE_JOIN_REMINDER_MINUTES'
  | 'SESSION_LATE_REMINDER_ENABLED'
  | 'SESSION_LATE_REMINDER_MINUTES_AFTER_START'
  | 'SESSION_REMINDER_15_MINUTES_ENABLED'
  | 'SESSION_REMINDER_60_MINUTES_ENABLED'
  | 'SESSION_REMINDER_OFFSETS_MINUTES'
  | 'SESSION_START_REMINDER_ENABLED'
  | `file.uploads.${
      | 'chat.enabled'
      | 'chat.allowedImageMimeTypes'
      | 'chat.allowedDocumentMimeTypes'
      | 'chat.maxImageBytes'
      | 'chat.maxDocumentBytes'
      | 'chat.maxFilesPerMessage'
      | 'chat.maxCombinedBytes'
      | 'user-avatar.enabled'
      | 'user-avatar.allowedMimeTypes'
      | 'user-avatar.maxBytes'
      | 'patient-avatar.enabled'
      | 'patient-avatar.allowedMimeTypes'
      | 'patient-avatar.maxBytes'
      | 'practitioner-avatar.enabled'
      | 'practitioner-avatar.allowedMimeTypes'
      | 'practitioner-avatar.maxBytes'
      | 'practitioner-credential.enabled'
      | 'practitioner-credential.allowedMimeTypes'
      | 'practitioner-credential.maxBytes'
      | 'payout-proof.enabled'
      | 'payout-proof.allowedMimeTypes'
      | 'payout-proof.maxBytes'
      | 'article-cover.enabled'
      | 'article-cover.allowedMimeTypes'
      | 'article-cover.maxBytes'
      | 'academy-program-cover.enabled'
      | 'academy-program-cover.allowedMimeTypes'
      | 'academy-program-cover.maxBytes'
      | 'academy-certificate.enabled'
      | 'academy-certificate.allowedMimeTypes'
      | 'academy-certificate.maxBytes'
    }`;

type NestedKey<K extends string> = K extends infer Current extends string
  ? NestedKeyFor<Current, Current>
  : never;

type NestedKeyFor<
  K extends string,
  Full extends string,
> = K extends `${infer Head}.${infer Tail}`
  ? { readonly [P in Head]: NestedKeyFor<Tail, Full> }
  : { readonly [P in K]: Full };

type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends (value: infer I) => void
  ? I
  : never;

type Simplify<T> = { readonly [K in keyof T]: T[K] };
export type ConfigKeyNamespace = Simplify<
  UnionToIntersection<NestedKey<ConfigKey>>
>;

function deriveConfigKeys(
  definitions: readonly { readonly key: string }[],
): ConfigKeyNamespace {
  const root: Record<string, unknown> = {};
  for (const definition of definitions) {
    const segments = definition.key.split('.');
    let current = root;
    for (const [index, segment] of segments.entries()) {
      if (index === segments.length - 1) {
        current[segment] = definition.key;
        continue;
      }
      current[segment] ??= {};
      current = current[segment] as Record<string, unknown>;
    }
  }
  return deepFreeze(root) as ConfigKeyNamespace;
}

/** Compatibility namespace derived from the canonical domain definitions. */
export const CONFIG_KEYS = deriveConfigKeys(CONFIG_DEFINITIONS);

/** Compatibility flat list derived from the canonical domain definitions. */
export const CONFIG_KEY_LIST = Object.freeze(
  CONFIG_DEFINITIONS.map((definition) => definition.key as ConfigKey),
);
