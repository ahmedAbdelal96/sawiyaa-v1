// This contract is intentionally limited to master definitions. It never
// represents user notifications, devices, preferences, or delivery state.
export const PRODUCTION_NOTIFICATION_TYPE_SLUGS = [
  'auth.practitioner-login-otp', 'auth.practitioner-signup-email-verification', 'auth.password-reset',
  'admin.practitioner-application-approved', 'admin.practitioner-application-rejected', 'admin.practitioner-application-changes-requested',
  'payments.payment-succeeded', 'payments.payment-failed', 'payments.refund-requested', 'payments.refund-succeeded', 'payments.refund-failed',
  'sessions.session-confirmed', 'sessions.session-confirmed-practitioner', 'sessions.session-cancelled', 'sessions.session-cancelled-practitioner', 'sessions.session-join-available',
  'messages.session-message-received', 'messages.support-message-received', 'messages.follow-up-message-received',
  'care-chat.request-approved', 'care-chat.request-rejected', 'care-chat.request-revoked',
  'sessions.session-reminder-60', 'sessions.session-reminder-15', 'sessions.session-starting-now', 'sessions.session-late-join', 'sessions.session-reminder-before-start',
  'instant-booking.request-created', 'instant-booking.request-accepted', 'instant-booking.request-rejected', 'instant-booking.request-expired',
  'availability.week-ending-reminder', 'dev.push-test', 'moderation.report-created', 'moderation.report-reviewed',
] as const;

export const PRODUCTION_NOTIFICATION_TEMPLATE_SLUGS = [
  'auth.practitioner-login-otp.email.v1', 'auth.practitioner-signup-email-verification.email.v1', 'auth.password-reset.email.v1',
  'admin.practitioner-application-approved.in-app.v1', 'admin.practitioner-application-rejected.in-app.v1', 'admin.practitioner-application-changes-requested.in-app.v1',
  'payments.payment-succeeded.in-app.v1', 'payments.payment-succeeded.email.v1', 'payments.payment-failed.in-app.v1', 'payments.refund-requested.in-app.v1', 'payments.refund-succeeded.in-app.v1', 'payments.refund-failed.in-app.v1',
  'sessions.session-confirmed.in-app.v1', 'sessions.session-confirmed-practitioner.in-app.v1', 'sessions.session-cancelled.in-app.v1', 'sessions.session-cancelled-practitioner.in-app.v1', 'sessions.session-join-available.in-app.v1', 'sessions.session-join-available.email.v1',
  'messages.session-message-received.in-app.v1', 'messages.session-message-received.push.v1', 'messages.support-message-received.in-app.v1', 'messages.support-message-received.push.v1', 'messages.follow-up-message-received.in-app.v1', 'messages.follow-up-message-received.push.v1',
  'care-chat.request-approved.in-app.v1', 'care-chat.request-approved.push.v1', 'care-chat.request-rejected.in-app.v1', 'care-chat.request-rejected.push.v1', 'care-chat.request-revoked.in-app.v1', 'care-chat.request-revoked.push.v1',
  'sessions.session-reminder-60.in-app.v1', 'sessions.session-reminder-60.email.v1', 'sessions.session-reminder-15.in-app.v1', 'sessions.session-reminder-15.email.v1', 'sessions.session-starting-now.in-app.v1', 'sessions.session-starting-now.email.v1', 'sessions.session-late-join.in-app.v1', 'sessions.session-late-join.email.v1', 'sessions.session-reminder-before-start.in-app.v1', 'sessions.session-reminder-before-start.email.v1',
  'instant-booking.request-created.email.v1', 'instant-booking.request-accepted.email.v1', 'instant-booking.request-rejected.email.v1', 'instant-booking.request-expired.email.v1',
  'availability.week-ending-reminder.in-app.v1', 'availability.week-ending-reminder.email.v1', 'availability.week-ending-reminder.push.v1', 'moderation.report-created.in-app.v1', 'moderation.report-reviewed.in-app.v1',
] as const;

export function templatePlaceholders(value: string | null): string[] {
  return [...(value ?? '').matchAll(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g)].map((match) => match[1]).sort();
}
