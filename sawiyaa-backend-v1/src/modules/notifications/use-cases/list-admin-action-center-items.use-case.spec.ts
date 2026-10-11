import { NotificationStatus } from '@prisma/client';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { NotificationContextEnrichmentService } from '../services/notification-context-enrichment.service';
import { ListAdminActionCenterItemsUseCase } from './list-admin-action-center-items.use-case';

describe('ListAdminActionCenterItemsUseCase', () => {
  const repository = {
    listAdminActionCenterNotifications: jest.fn(),
  };
  const presenter = {
    toListItem: jest.fn(),
    presentPagination: jest.fn().mockReturnValue({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    }),
  };
  const enrichmentService = {
    enrichMany: jest.fn().mockResolvedValue(new Map()),
  };

  const useCase = new ListAdminActionCenterItemsUseCase(
    repository as unknown as OperationalNotificationRepository,
    presenter as unknown as NotificationOpsPresenter,
    enrichmentService as unknown as NotificationContextEnrichmentService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.listAdminActionCenterNotifications.mockResolvedValue([[], 0]);
  });

  it('queries only explicit action-center types for the current reviewer', async () => {
    const listActionCenterNotifications =
      repository.listAdminActionCenterNotifications;
    await useCase.execute({
      authenticatedUserId: 'reviewer-1',
      query: {},
    });

    expect(listActionCenterNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'reviewer-1',
        typeSlugs: ['moderation.report-created'],
        statuses: [
          NotificationStatus.PENDING,
          NotificationStatus.QUEUED,
          NotificationStatus.SENT,
          NotificationStatus.DELIVERED,
          NotificationStatus.READ,
        ],
        page: 1,
        limit: 20,
      }),
    );
  });

  it('does not enrich routine rows because they are never returned by the projection', async () => {
    const enrichMany = enrichmentService.enrichMany;
    await useCase.execute({
      authenticatedUserId: 'reviewer-1',
      query: {},
    });

    expect(enrichMany).toHaveBeenCalledWith([]);
  });
});
