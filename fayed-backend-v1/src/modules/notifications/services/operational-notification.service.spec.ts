import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { OperationalNotificationService } from './operational-notification.service';

describe('OperationalNotificationService', () => {
  function buildService(input?: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
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
    const findUserRecipient = jest
      .fn()
      .mockImplementation((userId: string) => ({
        id: userId,
        displayName: `User ${userId}`,
        defaultLocale: input?.locale ?? 'en',
        emails: [{ email: `${userId}@example.com`, isVerified: true }],
      }));
    const findTypeBySlug = jest.fn().mockResolvedValue({
      id: 'type_1',
      supportsInApp: true,
      supportsEmail: input?.emailEnabled ?? true,
      supportsPush: input?.pushEnabled ?? false,
      templates: [
        { id: 'tpl_in', channel: NotificationChannel.IN_APP },
        { id: 'tpl_email', channel: NotificationChannel.EMAIL },
        { id: 'tpl_push', channel: NotificationChannel.PUSH },
      ],
    });
    const findPreference = jest.fn().mockResolvedValue(null);
    const createNotification = jest.fn().mockResolvedValue({ id: 'notif_1' });
    const updateNotificationStatus = jest.fn().mockResolvedValue({});
    const scheduleMany = jest.fn().mockResolvedValue({ count: 4 });
    const cancelFutureBySessionId = jest.fn().mockResolvedValue({ count: 1 });

    const repository = {
      findPatientRecipient,
      findPractitionerRecipient,
      findUserRecipient,
      findTypeBySlug,
      findPreference,
      createNotification,
      updateNotificationStatus,
    } as unknown as OperationalNotificationRepository;
    const sessionReminderQueueRepository = {
      scheduleMany,
      cancelFutureBySessionId,
    } as unknown as import('../repositories/session-reminder-queue.repository').SessionReminderQueueRepository;

    const i18nService = {
      t: jest.fn((key: string) => key),
    } as unknown as I18nService;

    const service = new OperationalNotificationService(
      repository,
      sessionReminderQueueRepository,
      i18nService,
    );

    return {
      service,
      findPreference,
      createNotification,
      updateNotificationStatus,
      scheduleMany,
      cancelFutureBySessionId,
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

  it('queues session chat notifications for the other conversation participant only', async () => {
    const setup = buildService({ emailEnabled: false, pushEnabled: true });

    await setup.service.notifyConversationMessage({
      lane: 'SESSION_CHAT',
      threadId: 'conv_1',
      messageId: 'msg_1',
      senderUserId: 'user_1',
      participants: [
        { userId: 'user_1', participantRole: 'PATIENT' },
        { userId: 'user_2', participantRole: 'PRACTITIONER' },
      ],
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_2',
        channel: NotificationChannel.IN_APP,
        relatedEntityType: 'GENERAL_CHAT_MESSAGE',
        relatedEntityId: 'msg_1',
        idempotencyKey: 'messages.session-message:msg_1:user_2:in-app',
        payloadJson: expect.objectContaining({
          routePath: '/en/practitioner/messages/conv_1',
          threadId: 'conv_1',
          targetRole: 'PRACTITIONER',
          relatedEntityType: 'GENERAL_CHAT_MESSAGE',
          relatedEntityId: 'msg_1',
          category: 'CHAT',
        }),
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_2',
        channel: NotificationChannel.PUSH,
        relatedEntityType: 'GENERAL_CHAT_MESSAGE',
        relatedEntityId: 'msg_1',
        idempotencyKey: 'messages.session-message:msg_1:user_2:push',
        payloadJson: expect.objectContaining({
          routePath: '/en/practitioner/messages/conv_1',
          targetRole: 'PRACTITIONER',
        }),
      }),
    );
    expect(setup.createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        relatedEntityId: 'msg_1',
      }),
    );
  });

  it('queues support notifications without notifying the sender', async () => {
    const setup = buildService({ emailEnabled: false, pushEnabled: true });

    await setup.service.notifyConversationMessage({
      lane: 'SUPPORT',
      threadId: 'ticket_1',
      messageId: 'msg_2',
      senderUserId: 'support_1',
      participants: [
        { userId: 'support_1', participantRole: 'PATIENT' },
        { userId: 'user_3', participantRole: 'PRACTITIONER' },
      ],
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_3',
        channel: NotificationChannel.IN_APP,
        relatedEntityType: 'SUPPORT_MESSAGE',
        relatedEntityId: 'msg_2',
        idempotencyKey: 'messages.support-message:msg_2:user_3:in-app',
        payloadJson: expect.objectContaining({
          routePath: '/en/practitioner/support/ticket_1',
          targetRole: 'PRACTITIONER',
        }),
      }),
    );
    expect(setup.createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'support_1',
        relatedEntityId: 'msg_2',
      }),
    );
  });

  it('queues follow-up chat notifications for the other participant only', async () => {
    const setup = buildService({ emailEnabled: false, pushEnabled: true });

    await setup.service.notifyConversationMessage({
      lane: 'CARE_CHAT',
      threadId: 'care_1',
      messageId: 'msg_3',
      senderUserId: 'user_4',
      participants: [
        { userId: 'user_4', participantRole: 'PATIENT' },
        { userId: 'user_5', participantRole: 'PRACTITIONER' },
      ],
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_5',
        channel: NotificationChannel.IN_APP,
        relatedEntityType: 'CARE_CHAT_MESSAGE',
        relatedEntityId: 'msg_3',
        idempotencyKey: 'messages.follow-up-message:msg_3:user_5:in-app',
        payloadJson: expect.objectContaining({
          routePath: '/en/practitioner/care-chat/care_1',
          targetRole: 'PRACTITIONER',
        }),
      }),
    );
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
    const setup = buildService({ emailEnabled: false, pushEnabled: true });

    await setup.service.notifySessionConfirmed({
      patientProfileId: 'patient_1',
      practitionerProfileId: 'pr_1',
      sessionId: 'session_1',
      scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    expect(setup.createNotification).toHaveBeenCalledTimes(4);
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.IN_APP,
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.PUSH,
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
      }),
    );
  });

  it('attaches route paths and idempotency keys to confirmed session notifications', async () => {
    const setup = buildService({ emailEnabled: false, pushEnabled: true });

    await setup.service.notifySessionConfirmed({
      patientProfileId: 'patient_1',
      practitionerProfileId: 'pr_1',
      sessionId: 'session_1',
      scheduledStartAt: new Date('2026-08-02T10:00:00.000Z'),
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'sessions.session-confirmed:session_1:user_1:in-app',
        payloadJson: expect.objectContaining({
          routePath: '/en/patient/sessions/session_1',
          targetRole: 'PATIENT',
        }),
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey:
          'sessions.session-confirmed-practitioner:session_1:user_2:in-app',
        payloadJson: expect.objectContaining({
          routePath: '/en/practitioner/sessions/session_1',
          targetRole: 'PRACTITIONER',
        }),
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'sessions.session-confirmed:session_1:user_1:push',
        payloadJson: expect.objectContaining({
          routePath: '/en/patient/sessions/session_1',
          targetRole: 'PATIENT',
        }),
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey:
          'sessions.session-confirmed-practitioner:session_1:user_2:push',
        payloadJson: expect.objectContaining({
          routePath: '/en/practitioner/sessions/session_1',
          targetRole: 'PRACTITIONER',
        }),
      }),
    );
  });

  it('schedules 60 and 15 minute session reminders exactly once per recipient', async () => {
    const setup = buildService({ emailEnabled: false, pushEnabled: true });

    await setup.service.queueSessionReminders({
      patientProfileId: 'patient_1',
      practitionerProfileId: 'pr_1',
      sessionId: 'session_1',
      scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
    });

    expect(setup.scheduleMany).toHaveBeenCalledTimes(4);
    expect(setup.scheduleMany).toHaveBeenCalledWith([
      expect.objectContaining({
        sessionId: 'session_1',
        recipientUserId: 'user_1',
        recipientRole: 'PATIENT',
        reminderType: 'REMINDER_60',
        dueAt: new Date('2026-08-02T11:00:00.000Z'),
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_1',
      }),
    ]);
    expect(setup.scheduleMany).toHaveBeenCalledWith([
      expect.objectContaining({
        sessionId: 'session_1',
        recipientUserId: 'user_1',
        recipientRole: 'PATIENT',
        reminderType: 'REMINDER_15',
        dueAt: new Date('2026-08-02T11:45:00.000Z'),
        idempotencyKey: 'sessions.session-reminder-15:session_1:user_1',
      }),
    ]);
    expect(setup.scheduleMany).toHaveBeenCalledWith([
      expect.objectContaining({
        sessionId: 'session_1',
        recipientUserId: 'user_2',
        recipientRole: 'PRACTITIONER',
        reminderType: 'REMINDER_60',
        dueAt: new Date('2026-08-02T11:00:00.000Z'),
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_2',
      }),
    ]);
    expect(setup.scheduleMany).toHaveBeenCalledWith([
      expect.objectContaining({
        sessionId: 'session_1',
        recipientUserId: 'user_2',
        recipientRole: 'PRACTITIONER',
        reminderType: 'REMINDER_15',
        dueAt: new Date('2026-08-02T11:45:00.000Z'),
        idempotencyKey: 'sessions.session-reminder-15:session_1:user_2',
      }),
    ]);
  });

  it('skips reminders that are already past due at scheduling time', async () => {
    const setup = buildService({ emailEnabled: false });

    await setup.service.queueSessionReminders({
      patientProfileId: 'patient_1',
      practitionerProfileId: 'pr_1',
      sessionId: 'session_1',
      scheduledStartAt: new Date('2026-01-01T00:05:00.000Z'),
    });

    expect(setup.scheduleMany).not.toHaveBeenCalled();
  });

  it('attaches route paths and idempotency keys to cancelled session notifications', async () => {
    const setup = buildService({ emailEnabled: false, pushEnabled: true });

    await setup.service.notifySessionCancelledByPatient({
      patientProfileId: 'patient_1',
      practitionerProfileId: 'pr_1',
      sessionId: 'session_1',
      scheduledStartAt: new Date('2026-08-02T10:00:00.000Z'),
    });

    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'sessions.session-cancelled:session_1:user_1:in-app',
        payloadJson: expect.objectContaining({
          routePath: '/en/patient/sessions/session_1',
          targetRole: 'PATIENT',
        }),
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey:
          'sessions.session-cancelled-practitioner:session_1:user_2:in-app',
        payloadJson: expect.objectContaining({
          routePath: '/en/practitioner/sessions/session_1',
          targetRole: 'PRACTITIONER',
        }),
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'sessions.session-cancelled:session_1:user_1:push',
        payloadJson: expect.objectContaining({
          routePath: '/en/patient/sessions/session_1',
          targetRole: 'PATIENT',
        }),
      }),
    );
    expect(setup.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey:
          'sessions.session-cancelled-practitioner:session_1:user_2:push',
        payloadJson: expect.objectContaining({
          routePath: '/en/practitioner/sessions/session_1',
          targetRole: 'PRACTITIONER',
        }),
      }),
    );
    expect(setup.cancelFutureBySessionId).toHaveBeenCalledWith({
      sessionId: 'session_1',
      cancelledAt: expect.any(Date),
    });
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
