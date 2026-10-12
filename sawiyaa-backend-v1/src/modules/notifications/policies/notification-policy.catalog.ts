export type NotificationPurpose =
  | 'SECURITY'
  | 'TRANSACTIONAL'
  | 'ACTION_REQUIRED'
  | 'ROUTINE_REMINDER'
  | 'MESSAGING'
  | 'DELIVERY_OPERATION'
  | 'DEVELOPMENT';

export type NotificationAudienceKind =
  | 'USER'
  | 'PATIENT'
  | 'PRACTITIONER'
  | 'PARTICIPANTS'
  | 'ROLE_REVIEWERS'
  | 'DEVELOPMENT';

export type NotificationActionKind =
  | 'NONE'
  | 'SESSION'
  | 'PAYMENT'
  | 'REFUND'
  | 'CONVERSATION'
  | 'SUPPORT'
  | 'AVAILABILITY'
  | 'APPLICATION'
  | 'MODERATION_REVIEW'
  | 'DEVELOPMENT';

export type NotificationPolicy = {
  purpose: NotificationPurpose;
  audienceKind: NotificationAudienceKind;
  adminActionCenterVisible: boolean;
  deliveryOperationsVisible: boolean;
  actionKind: NotificationActionKind;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
};

const userTransactional = (
  actionKind: NotificationActionKind = 'NONE',
): NotificationPolicy => ({
  purpose: 'TRANSACTIONAL',
  audienceKind: 'USER',
  adminActionCenterVisible: false,
  deliveryOperationsVisible: true,
  actionKind,
});

const participantTransactional = (
  actionKind: NotificationActionKind,
): NotificationPolicy => ({
  purpose: 'TRANSACTIONAL',
  audienceKind: 'PARTICIPANTS',
  adminActionCenterVisible: false,
  deliveryOperationsVisible: true,
  actionKind,
});

const participantRoutine = (): NotificationPolicy => ({
  purpose: 'ROUTINE_REMINDER',
  audienceKind: 'PARTICIPANTS',
  adminActionCenterVisible: false,
  deliveryOperationsVisible: true,
  actionKind: 'SESSION',
  priority: 'NORMAL',
});

const patientTransactional = (
  actionKind: NotificationActionKind = 'NONE',
): NotificationPolicy => ({
  purpose: 'TRANSACTIONAL',
  audienceKind: 'PATIENT',
  adminActionCenterVisible: false,
  deliveryOperationsVisible: true,
  actionKind,
});

const practitionerTransactional = (
  actionKind: NotificationActionKind = 'NONE',
): NotificationPolicy => ({
  purpose: 'TRANSACTIONAL',
  audienceKind: 'PRACTITIONER',
  adminActionCenterVisible: false,
  deliveryOperationsVisible: true,
  actionKind,
});

const participantMessaging = (
  actionKind: NotificationActionKind,
): NotificationPolicy => ({
  purpose: 'MESSAGING',
  audienceKind: 'PARTICIPANTS',
  adminActionCenterVisible: false,
  deliveryOperationsVisible: true,
  actionKind,
});

export const NOTIFICATION_POLICY_CATALOG: Record<string, NotificationPolicy> = {
  'auth.practitioner-login-otp': {
    purpose: 'SECURITY',
    audienceKind: 'PRACTITIONER',
    adminActionCenterVisible: false,
    deliveryOperationsVisible: true,
    actionKind: 'NONE',
    priority: 'HIGH',
  },
  'auth.practitioner-signup-email-verification': {
    purpose: 'SECURITY',
    audienceKind: 'PRACTITIONER',
    adminActionCenterVisible: false,
    deliveryOperationsVisible: true,
    actionKind: 'NONE',
    priority: 'HIGH',
  },
  'auth.password-reset': {
    purpose: 'SECURITY',
    audienceKind: 'USER',
    adminActionCenterVisible: false,
    deliveryOperationsVisible: true,
    actionKind: 'NONE',
    priority: 'HIGH',
  },
  'auth.password-changed': {
    purpose: 'SECURITY',
    audienceKind: 'USER',
    adminActionCenterVisible: false,
    deliveryOperationsVisible: true,
    actionKind: 'NONE',
    priority: 'HIGH',
  },
  'auth.password-reset-completed': {
    purpose: 'SECURITY',
    audienceKind: 'USER',
    adminActionCenterVisible: false,
    deliveryOperationsVisible: true,
    actionKind: 'NONE',
    priority: 'HIGH',
  },
  'admin.practitioner-application-approved': userTransactional('APPLICATION'),
  'admin.practitioner-application-rejected': userTransactional('APPLICATION'),
  'admin.practitioner-application-changes-requested':
    userTransactional('APPLICATION'),
  'payments.payment-succeeded': patientTransactional('PAYMENT'),
  'payments.payment-failed': patientTransactional('PAYMENT'),
  'payments.refund-requested': patientTransactional('REFUND'),
  'payments.refund-succeeded': patientTransactional('REFUND'),
  'payments.refund-failed': patientTransactional('REFUND'),
  'payments.package-purchase-succeeded': patientTransactional('PAYMENT'),
  'payments.academy-payment-succeeded': patientTransactional('PAYMENT'),
  'payments.manual-payment-submitted': patientTransactional('PAYMENT'),
  'payments.manual-payment-rejected': patientTransactional('PAYMENT'),
  'payments.manual-payment-review-required': {
    purpose: 'ACTION_REQUIRED',
    audienceKind: 'ROLE_REVIEWERS',
    adminActionCenterVisible: true,
    deliveryOperationsVisible: true,
    actionKind: 'PAYMENT',
    priority: 'HIGH',
  },
  'financial.practitioner-earning-credited':
    practitionerTransactional('PAYMENT'),
  'financial.practitioner-payout-completed':
    practitionerTransactional('PAYMENT'),
  'sessions.session-confirmed': participantTransactional('SESSION'),
  'sessions.session-confirmed-practitioner':
    participantTransactional('SESSION'),
  'sessions.session-cancelled': participantTransactional('SESSION'),
  'sessions.session-cancelled-practitioner':
    participantTransactional('SESSION'),
  'sessions.session-join-available': participantTransactional('SESSION'),
  'sessions.session-reminder-60': participantRoutine(),
  'sessions.session-reminder-15': participantRoutine(),
  'sessions.session-starting-now': participantRoutine(),
  'sessions.session-late-join': participantRoutine(),
  'sessions.session-reminder-before-start': participantRoutine(),
  'messages.session-message-received': participantMessaging('CONVERSATION'),
  'messages.support-message-received': participantMessaging('SUPPORT'),
  'messages.follow-up-message-received': participantMessaging('CONVERSATION'),
  'care-chat.request-approved': participantMessaging('CONVERSATION'),
  'care-chat.request-rejected': patientTransactional('CONVERSATION'),
  'care-chat.request-revoked': participantMessaging('CONVERSATION'),
  'instant-booking.request-created': practitionerTransactional('APPLICATION'),
  'instant-booking.request-accepted': patientTransactional('PAYMENT'),
  'instant-booking.request-rejected': patientTransactional('SESSION'),
  'instant-booking.request-expired': patientTransactional('SESSION'),
  'availability.week-ending-reminder':
    practitionerTransactional('AVAILABILITY'),
  'dev.push-test': {
    purpose: 'DEVELOPMENT',
    audienceKind: 'DEVELOPMENT',
    adminActionCenterVisible: false,
    deliveryOperationsVisible: false,
    actionKind: 'DEVELOPMENT',
  },
  'moderation.report-created': {
    purpose: 'ACTION_REQUIRED',
    audienceKind: 'ROLE_REVIEWERS',
    adminActionCenterVisible: true,
    deliveryOperationsVisible: true,
    actionKind: 'MODERATION_REVIEW',
    priority: 'HIGH',
  },
  'moderation.report-reviewed': userTransactional('MODERATION_REVIEW'),
};

const UNKNOWN_NOTIFICATION_POLICY: NotificationPolicy = {
  purpose: 'DELIVERY_OPERATION',
  audienceKind: 'USER',
  adminActionCenterVisible: false,
  deliveryOperationsVisible: true,
  actionKind: 'NONE',
};

export function getNotificationPolicy(slug: string): NotificationPolicy {
  return NOTIFICATION_POLICY_CATALOG[slug] ?? UNKNOWN_NOTIFICATION_POLICY;
}

export function isAdminActionCenterVisible(slug: string): boolean {
  return getNotificationPolicy(slug).adminActionCenterVisible;
}

export function getAdminActionCenterTypeSlugs(): string[] {
  return Object.entries(NOTIFICATION_POLICY_CATALOG)
    .filter(([, policy]) => policy.adminActionCenterVisible)
    .map(([slug]) => slug);
}

export function isDeliveryOperationsVisible(slug: string): boolean {
  return getNotificationPolicy(slug).deliveryOperationsVisible;
}
