import { NotificationChannel } from '@prisma/client';
import { NotificationEmailService } from './notification-email.service';
import { NotificationChannelExecutionService } from './notification-channel-execution.service';
import { NotificationPushExecutionService } from './notification-push-execution.service';

describe('NotificationChannelExecutionService', () => {
  const emailService = {
    sendEmail: jest.fn(),
  } as unknown as NotificationEmailService;

  const pushExecutionService = {
    execute: jest.fn(),
  } as unknown as NotificationPushExecutionService;

  const service = new NotificationChannelExecutionService(
    emailService,
    pushExecutionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes in-app channel successfully without email provider', async () => {
    const result = await service.execute({
      id: 'n1',
      userId: 'u1',
      channel: NotificationChannel.IN_APP,
      titleSnapshot: 'Title',
      subjectSnapshot: null,
      bodySnapshot: 'Body',
      payloadJson: {},
      relatedEntityType: null,
      relatedEntityId: null,
      notificationType: { slug: 'test.in-app', category: 'SYSTEM' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        provider: 'IN_APP',
      }),
    );
    expect((emailService.sendEmail as jest.Mock).mock.calls).toHaveLength(0);
  });

  it('executes email channel successfully with normalized provider result', async () => {
    (emailService.sendEmail as jest.Mock).mockResolvedValue({
      delivered: true,
      deliveryTarget: 'user@example.com',
    });

    const result = await service.execute({
      id: 'n2',
      userId: 'u1',
      channel: NotificationChannel.EMAIL,
      titleSnapshot: 'Title',
      subjectSnapshot: 'Subject',
      bodySnapshot: 'Body',
      payloadJson: { target: 'user@example.com' },
      relatedEntityType: null,
      relatedEntityId: null,
      notificationType: { slug: 'test.email', category: 'SYSTEM' },
    });

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        notificationId: 'n2',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        provider: 'SMTP',
      }),
    );
  });

  it('maps email missing target as deterministic failure', async () => {
    const result = await service.execute({
      id: 'n3',
      userId: 'u1',
      channel: NotificationChannel.EMAIL,
      titleSnapshot: 'Title',
      subjectSnapshot: 'Subject',
      bodySnapshot: 'Body',
      payloadJson: {},
      relatedEntityType: null,
      relatedEntityId: null,
      notificationType: { slug: 'test.email', category: 'SYSTEM' },
    });

    expect(result).toEqual({
      success: false,
      provider: 'SMTP',
      errorCode: 'EMAIL_TARGET_MISSING',
      errorMessage: 'EMAIL_TARGET_MISSING',
    });
  });
});
