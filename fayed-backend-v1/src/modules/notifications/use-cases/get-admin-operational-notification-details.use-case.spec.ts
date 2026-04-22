import { NotFoundException } from '@nestjs/common';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { GetAdminOperationalNotificationDetailsUseCase } from './get-admin-operational-notification-details.use-case';

describe('GetAdminOperationalNotificationDetailsUseCase', () => {
  const repository = {
    findOperationalNotificationById: jest.fn(),
  } as unknown as OperationalNotificationRepository;
  const presenter = {
    toDetailItem: jest.fn().mockReturnValue({ id: 'n1' }),
  } as unknown as NotificationOpsPresenter;

  const useCase = new GetAdminOperationalNotificationDetailsUseCase(
    repository,
    presenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns details when notification exists', async () => {
    (repository.findOperationalNotificationById as jest.Mock).mockResolvedValue(
      {
        id: 'n1',
      },
    );

    const result = await useCase.execute({ notificationId: 'n1' });

    expect(result).toEqual({ item: { id: 'n1' } });
    expect(repository.findOperationalNotificationById).toHaveBeenCalledWith(
      'n1',
      [
        'payments.payment-succeeded',
        'payments.refund-succeeded',
        'sessions.session-confirmed',
        'sessions.session-confirmed-practitioner',
        'training.schedule-reminder',
        'training.enrollment-confirmed',
      ],
      ['auth.'],
    );
  });

  it('throws not found when notification is missing', async () => {
    (repository.findOperationalNotificationById as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({ notificationId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });
});
