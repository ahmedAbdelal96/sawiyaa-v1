import { NotificationStatus } from '@prisma/client';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { ListAdminOperationalNotificationsUseCase } from './list-admin-operational-notifications.use-case';
import { NotificationContextEnrichmentService } from '../services/notification-context-enrichment.service';

describe('ListAdminOperationalNotificationsUseCase', () => {
  const repository = {
    listOperationalNotifications: jest.fn(),
  } as unknown as OperationalNotificationRepository;
  const presenter = {
    toListItem: jest.fn().mockImplementation((v) => v),
    presentPagination: jest.fn().mockReturnValue({
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    }),
  } as unknown as NotificationOpsPresenter;
  const enrichmentService = {
    enrichMany: jest.fn().mockResolvedValue(new Map()),
  } as unknown as NotificationContextEnrichmentService;

  const useCase = new ListAdminOperationalNotificationsUseCase(
    repository,
    presenter,
    enrichmentService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (repository.listOperationalNotifications as jest.Mock).mockResolvedValue([
      [],
      0,
    ]);
  });

  it('uses default operational statuses when status filter is omitted', async () => {
    await useCase.execute({ query: {} });

    expect(repository.listOperationalNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        excludedTypeSlugs: [
          'payments.payment-succeeded',
          'payments.refund-succeeded',
          'sessions.session-confirmed',
          'sessions.session-confirmed-practitioner',
        ],
        excludedTypePrefixes: ['auth.'],
        statuses: [
          NotificationStatus.PENDING,
          NotificationStatus.QUEUED,
          NotificationStatus.FAILED,
          NotificationStatus.SUPPRESSED,
        ],
      }),
    );
  });

  it('uses explicit status filter when provided', async () => {
    await useCase.execute({
      query: {
        status: NotificationStatus.FAILED,
        page: 2,
        limit: 10,
      },
    });

    expect(repository.listOperationalNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        excludedTypeSlugs: [
          'payments.payment-succeeded',
          'payments.refund-succeeded',
          'sessions.session-confirmed',
          'sessions.session-confirmed-practitioner',
        ],
        excludedTypePrefixes: ['auth.'],
        statuses: [NotificationStatus.FAILED],
        page: 2,
        limit: 10,
      }),
    );
  });
});
