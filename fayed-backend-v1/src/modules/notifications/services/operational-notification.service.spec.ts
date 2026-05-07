import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { OperationalNotificationService } from './operational-notification.service';

describe('OperationalNotificationService', () => {
  function buildService(input?: {
    emailEnabled?: boolean;
    locale?: 'en' | 'ar';
  }) {
    const findPatientRecipient = jest.fn().mockResolvedValue({
      user: {
        id: 'user_1',
        displayName: 'Patient One',
        defaultLocale: input?.locale ?? 'en',
        emails: [{ email: 'patient@example.com', isVerified: true }],
      },
    });
    const findPractitionerRecipient = jest.fn().mockResolvedValue({
      user: {
        id: 'user_2',
        displayName: 'Practitioner One',
        defaultLocale: input?.locale ?? 'en',
        emails: [{ email: 'pr@example.com', isVerified: true }],
      },
    });
    const findUserRecipient = jest.fn().mockResolvedValue({
      id: 'user_3',
      displayName: 'Training User',
      defaultLocale: input?.locale ?? 'en',
      emails: [{ email: 'training@example.com', isVerified: true }],
    });
    const findTypeBySlug = jest.fn().mockResolvedValue({
      id: 'type_1',
      supportsInApp: true,
      supportsEmail: input?.emailEnabled ?? true,
      templates: [
        { id: 'tpl_in', channel: NotificationChannel.IN_APP },
        { id: 'tpl_email', channel: NotificationChannel.EMAIL },
      ],
    });
    const findPreference = jest.fn().mockResolvedValue(null);
    const createNotification = jest.fn().mockResolvedValue({ id: 'notif_1' });
    const updateNotificationStatus = jest.fn().mockResolvedValue({});

    const repository = {
      findPatientRecipient,
      findPractitionerRecipient,
      findUserRecipient,
      findTypeBySlug,
      findPreference,
      createNotification,
      updateNotificationStatus,
    } as unknown as OperationalNotificationRepository;

    const i18nService = {
      t: jest.fn((key: string) => key),
    } as unknown as I18nService;

    const service = new OperationalNotificationService(repository, i18nService);

    return {
      service,
      findPreference,
      createNotification,
      updateNotificationStatus,
    };
  }

  it('queues in-app and email notifications without calling the email provider synchronously', async () => {
    const setup = buildService({ emailEnabled: true });

    await setup.service.notifyPaymentSucceeded({
      patientProfileId: 'patient_1',
      paymentId: 'payment_1',
      amount: '100.00',
      currencyCode: 'USD',
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        relatedEntityType: 'PAYMENT',
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
        relatedEntityType: 'PAYMENT',
      }),
    );
    expect(setup.updateNotificationStatus).not.toHaveBeenCalled();
  });

  it('suppresses email when user preference disables the channel', async () => {
    const setup = buildService({ emailEnabled: true });
    setup.findPreference.mockImplementation(
      ({ channel }: { channel: NotificationChannel }) =>
        channel === NotificationChannel.EMAIL ? { isEnabled: false } : null,
    );

    await setup.service.notifyPaymentSucceeded({
      patientProfileId: 'patient_1',
      paymentId: 'payment_1',
      amount: '100.00',
      currencyCode: 'USD',
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SUPPRESSED,
      }),
    );
    expect(setup.updateNotificationStatus).not.toHaveBeenCalled();
  });

  it('queues email notifications for later asynchronous delivery on refund failure', async () => {
    const setup = buildService({ emailEnabled: true });

    await setup.service.notifyRefundFailed({
      patientProfileId: 'patient_1',
      refundId: 'refund_1',
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
      }),
    );
    expect(setup.updateNotificationStatus).not.toHaveBeenCalled();
  });

  it('sends session confirmation notifications to patient and practitioner', async () => {
    const setup = buildService({ emailEnabled: false });

    await setup.service.notifySessionConfirmed({
      patientProfileId: 'patient_1',
      practitionerProfileId: 'pr_1',
      sessionId: 'session_1',
      scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    expect(setup.createNotification).toHaveBeenCalledTimes(2);
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.IN_APP,
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
      }),
    );
  });

  it('includes package context in session confirmation payloads when provided', async () => {
    const setup = buildService({ emailEnabled: false });

    await setup.service.notifySessionConfirmed({
      patientProfileId: 'patient_1',
      practitionerProfileId: 'pr_1',
      sessionId: 'session_1',
      scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
      packageContext: {
        packagePurchaseId: 'purchase_1',
        packagePlanCode: 'SESSIONS_4',
        packagePlanTitle: '4 sessions',
        packageSessionIndex: 2,
        packageSessionCount: 4,
        packageDiscountPercent: 10,
      },
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadJson: expect.objectContaining({
          packagePurchaseId: 'purchase_1',
          packagePlanCode: 'SESSIONS_4',
          packagePlanTitle: '4 sessions',
          packageSessionIndex: 2,
          packageSessionCount: 4,
          packageDiscountPercent: 10,
        }),
      }),
    );
  });

  it('queues training schedule reminder as queued notification hook', async () => {
    const setup = buildService({ emailEnabled: false });

    await setup.service.queueTrainingScheduleReminder({
      userId: 'user_3',
      enrollmentId: 'en_1',
      scheduleId: 'schedule_1',
      scheduledFor: new Date('2026-05-01T08:00:00.000Z'),
      scheduledStartAt: new Date('2026-05-02T08:00:00.000Z'),
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        relatedEntityType: 'TRAINING_ENROLLMENT',
        relatedEntityId: 'en_1',
      }),
    );
  });
});
