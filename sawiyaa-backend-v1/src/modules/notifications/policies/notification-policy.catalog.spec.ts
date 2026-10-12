import {
  PRODUCTION_NOTIFICATION_TEMPLATE_SLUGS,
  PRODUCTION_NOTIFICATION_TYPE_SLUGS,
} from '../../../../prisma/seed/modules/notification-baseline.contract';
import {
  getNotificationPolicy,
  isAdminActionCenterVisible,
  NOTIFICATION_POLICY_CATALOG,
} from './notification-policy.catalog';

const ROUTINE_ADMIN_EXCLUSIONS = [
  'sessions.session-join-available',
  'sessions.session-reminder-60',
  'sessions.session-reminder-15',
  'sessions.session-starting-now',
  'sessions.session-late-join',
  'sessions.session-reminder-before-start',
  'sessions.session-confirmed',
  'sessions.session-confirmed-practitioner',
  'sessions.session-cancelled',
  'sessions.session-cancelled-practitioner',
  'messages.session-message-received',
  'messages.support-message-received',
  'messages.follow-up-message-received',
  'payments.payment-succeeded',
  'payments.refund-succeeded',
  'payments.package-purchase-succeeded',
  'payments.academy-payment-succeeded',
  'financial.practitioner-earning-credited',
  'financial.practitioner-payout-completed',
  'availability.week-ending-reminder',
  'care-chat.request-approved',
  'care-chat.request-rejected',
  'care-chat.request-revoked',
] as const;

describe('notification policy catalog', () => {
  it('reconciles the authoritative inventory to 44 types and 56 templates', () => {
    expect(PRODUCTION_NOTIFICATION_TYPE_SLUGS).toHaveLength(44);
    expect(PRODUCTION_NOTIFICATION_TEMPLATE_SLUGS).toHaveLength(56);
    expect(PRODUCTION_NOTIFICATION_TYPE_SLUGS).toEqual(
      expect.arrayContaining([
        'payments.package-purchase-succeeded',
        'payments.academy-payment-succeeded',
        'financial.practitioner-earning-credited',
        'financial.practitioner-payout-completed',
      ]),
    );
  });

  it('has explicit policy entries for every runtime notification type', () => {
    expect(Object.keys(NOTIFICATION_POLICY_CATALOG)).toHaveLength(44);
    for (const slug of PRODUCTION_NOTIFICATION_TYPE_SLUGS) {
      expect(getNotificationPolicy(slug)).toBeDefined();
    }
  });

  it('defaults unknown types to invisible in the Admin Action Center', () => {
    expect(isAdminActionCenterVisible('future.routine-event')).toBe(false);
    expect(getNotificationPolicy('future.routine-event')).toMatchObject({
      adminActionCenterVisible: false,
    });
  });

  it.each(ROUTINE_ADMIN_EXCLUSIONS)(
    'does not expose routine participant type %s in the Admin Action Center',
    (slug) => {
      expect(isAdminActionCenterVisible(slug)).toBe(false);
    },
  );

  it('keeps moderation reports as explicit reviewer actions', () => {
    expect(isAdminActionCenterVisible('moderation.report-created')).toBe(true);
    expect(getNotificationPolicy('moderation.report-created')).toMatchObject({
      audienceKind: 'ROLE_REVIEWERS',
      purpose: 'ACTION_REQUIRED',
      actionKind: 'MODERATION_REVIEW',
    });
  });

  it('keeps manual payment review as an explicit reviewer action', () => {
    expect(isAdminActionCenterVisible('payments.manual-payment-review-required')).toBe(true);
    expect(getNotificationPolicy('payments.manual-payment-review-required')).toMatchObject({
      audienceKind: 'ROLE_REVIEWERS',
      purpose: 'ACTION_REQUIRED',
      actionKind: 'PAYMENT',
    });
  });

  it('exposes only explicit action-center types as an allowlist', async () => {
    const { getAdminActionCenterTypeSlugs } =
      await import('./notification-policy.catalog');

    expect(getAdminActionCenterTypeSlugs()).toEqual([
      'payments.manual-payment-review-required',
      'moderation.report-created',
    ]);
  });
});
