const AUDIT_ONLY_TYPE_PREFIXES = ['auth.'] as const;

const AUDIT_ONLY_TYPE_SLUGS = [
  'payments.payment-succeeded',
  'payments.refund-succeeded',
  'sessions.session-confirmed',
  'sessions.session-confirmed-practitioner',
  'training.schedule-reminder',
  'training.enrollment-confirmed',
] as const;

export function getAdminNotificationFeedExcludedTypeSlugs(): string[] {
  return [...AUDIT_ONLY_TYPE_SLUGS];
}

export function getAdminNotificationFeedExcludedTypePrefixes(): string[] {
  return [...AUDIT_ONLY_TYPE_PREFIXES];
}

export function isAdminNotificationTypeVisible(slug: string): boolean {
  if (AUDIT_ONLY_TYPE_SLUGS.includes(slug as (typeof AUDIT_ONLY_TYPE_SLUGS)[number])) {
    return false;
  }

  return !AUDIT_ONLY_TYPE_PREFIXES.some((prefix) => slug.startsWith(prefix));
}
