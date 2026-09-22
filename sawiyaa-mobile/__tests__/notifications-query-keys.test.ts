import {
  patientNotificationQueryKeys,
} from '../src/features/patient/notifications/query-keys';
import {
  practitionerNotificationQueryKeys,
} from '../src/features/practitioner/notifications/query-keys';

describe('mobile notification query identities', () => {
  const params = { page: 1, limit: 20 };

  it('separates Arabic and English list projections for both roles', () => {
    expect(patientNotificationQueryKeys.list(params, 'ar')).not.toEqual(
      patientNotificationQueryKeys.list(params, 'en'),
    );
    expect(practitionerNotificationQueryKeys.list(params, 'ar')).not.toEqual(
      practitionerNotificationQueryKeys.list(params, 'en'),
    );
  });

  it('keeps root invalidation broad and unread count locale-independent', () => {
    const patientArabic = patientNotificationQueryKeys.list(params, 'ar');
    const practitionerEnglish = practitionerNotificationQueryKeys.list(params, 'en');

    expect(patientArabic.slice(0, patientNotificationQueryKeys.all.length)).toEqual(
      patientNotificationQueryKeys.all,
    );
    expect(practitionerEnglish.slice(0, practitionerNotificationQueryKeys.all.length)).toEqual(
      practitionerNotificationQueryKeys.all,
    );
    expect(patientNotificationQueryKeys.unreadCount()).toEqual([
      ...patientNotificationQueryKeys.all,
      'unread-count',
    ]);
    expect(practitionerNotificationQueryKeys.unreadCount()).toEqual([
      ...practitionerNotificationQueryKeys.all,
      'unread-count',
    ]);
  });
});
