import { NotificationChannel } from '@prisma/client';
import { NotificationEmailService } from './notification-email.service';
import { NotificationChannelExecutionService } from './notification-channel-execution.service';

describe('NotificationChannelExecutionService', () => {
  const emailService = {
    sendEmail: jest.fn(),
  } as unknown as NotificationEmailService;

  const service = new NotificationChannelExecutionService(emailService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes in-app channel successfully without email provider', async () => {
    const result = await service.execute({
      id: 'n1',
      channel: NotificationChannel.IN_APP,
      titleSnapshot: 'Title',
      subjectSnapshot: null,
      bodySnapshot: 'Body',
      payloadJson: {},
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
      channel: NotificationChannel.EMAIL,
      titleSnapshot: 'Title',
      subjectSnapshot: 'Subject',
      bodySnapshot: 'Body',
      payloadJson: { target: 'user@example.com' },
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
      channel: NotificationChannel.EMAIL,
      titleSnapshot: 'Title',
      subjectSnapshot: 'Subject',
      bodySnapshot: 'Body',
      payloadJson: {},
    });

    expect(result).toEqual({
      success: false,
      provider: 'SMTP',
      errorCode: 'EMAIL_TARGET_MISSING',
      errorMessage: 'EMAIL_TARGET_MISSING',
    });
  });
});
