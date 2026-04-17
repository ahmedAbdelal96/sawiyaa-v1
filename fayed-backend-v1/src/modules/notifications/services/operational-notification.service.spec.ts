import {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { OperationalNotificationService } from './operational-notification.service';
import { NotificationEmailService } from './notification-email.service';

describe('OperationalNotificationService', () => {
  function buildService(input?: {
    emailEnabled?: boolean;
    emailDelivered?: boolean;
    locale?: 'en' | 'ar';
  }) {
    const repository = {
      findPatientRecipient: jest.fn().mockResolvedValue({
        user: {
          id: 'user_1',
          displayName: 'Patient One',
          defaultLocale: input?.locale ?? 'en',
          emails: [{ email: 'patient@example.com', isVerified: true }],
        },
      }),
      findPractitionerRecipient: jest.fn().mockResolvedValue({
        user: {
          id: 'user_2',
          displayName: 'Practitioner One',
          defaultLocale: input?.locale ?? 'en',
          emails: [{ email: 'pr@example.com', isVerified: true }],
        },
      }),
      findUserRecipient: jest.fn().mockResolvedValue({
        id: 'user_3',
        displayName: 'Training User',
        defaultLocale: input?.locale ?? 'en',
        emails: [{ email: 'training@example.com', isVerified: true }],
      }),
      findTypeBySlug: jest.fn().mockResolvedValue({
        id: 'type_1',
        supportsInApp: true,
        supportsEmail: input?.emailEnabled ?? true,
        templates: [
          { id: 'tpl_in', channel: NotificationChannel.IN_APP },
          { id: 'tpl_email', channel: NotificationChannel.EMAIL },
        ],
      }),
      findPreference: jest.fn().mockResolvedValue(null),
      createNotification: jest.fn().mockResolvedValue({ id: 'notif_1' }),
      updateNotificationStatus: jest.fn().mockResolvedValue({}),
    } as unknown as OperationalNotificationRepository;

    const i18nService = {
      t: jest.fn().mockImplementation((key) => key),
    } as unknown as I18nService;

    const notificationEmailService = {
      sendEmail: jest.fn().mockResolvedValue({
        delivered: input?.emailDelivered ?? true,
        deliveryTarget: 'patient@example.com',
        error: input?.emailDelivered === false ? 'MAIL_SEND_FAILED' : undefined,
      }),
    } as unknown as NotificationEmailService;

    const service = new OperationalNotificationService(
      repository,
      i18nService,
      notificationEmailService,
    );

    return {
      service,
      repository: repository as unknown as {
        findPreference: jest.Mock;
        createNotification: jest.Mock;
        updateNotificationStatus: jest.Mock;
      },
      notificationEmailService: notificationEmailService as unknown as {
        sendEmail: jest.Mock;
      },
    };
  }

  it('queues in-app and email for payment succeeded when available', async () => {
    const setup = buildService({ emailEnabled: true });

    await setup.service.notifyPaymentSucceeded({
      patientProfileId: 'patient_1',
      paymentId: 'payment_1',
      amount: '100.00',
      currencyCode: 'USD',
    });

    expect(setup.repository.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        relatedEntityType: 'PAYMENT',
      }),
    );
    expect(setup.notificationEmailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('suppresses channel when user preference disables email', async () => {
    const setup = buildService({ emailEnabled: true });
    setup.repository.findPreference.mockImplementation(({ channel }) =>
      channel === NotificationChannel.EMAIL ? { isEnabled: false } : null,
    );

    await setup.service.notifyPaymentSucceeded({
      patientProfileId: 'patient_1',
      paymentId: 'payment_1',
      amount: '100.00',
      currencyCode: 'USD',
    });

    expect(setup.notificationEmailService.sendEmail).not.toHaveBeenCalled();
    expect(setup.repository.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SUPPRESSED,
      }),
    );
  });

  it('marks email notification as failed when delivery fails', async () => {
    const setup = buildService({ emailEnabled: true, emailDelivered: false });

    await setup.service.notifyRefundFailed({
      patientProfileId: 'patient_1',
      refundId: 'refund_1',
    });

    expect(setup.repository.updateNotificationStatus).toHaveBeenCalledWith(
      'notif_1',
      expect.objectContaining({
        status: NotificationStatus.FAILED,
      }),
    );
  });

  it('sends session confirmation notifications to patient and practitioner', async () => {
    const setup = buildService({ emailEnabled: false });

    await setup.service.notifySessionConfirmed({
      patientProfileId: 'patient_1',
      practitionerProfileId: 'pr_1',
      sessionId: 'session_1',
      scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    const inAppCalls = setup.repository.createNotification.mock.calls.filter(
      ([arg]) => arg.channel === NotificationChannel.IN_APP,
    );
    expect(inAppCalls.length).toBeGreaterThanOrEqual(2);
    expect(inAppCalls[0][0]).toEqual(
      expect.objectContaining({
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
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

    expect(setup.repository.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        relatedEntityType: 'TRAINING_ENROLLMENT',
        relatedEntityId: 'en_1',
      }),
    );
  });
});
