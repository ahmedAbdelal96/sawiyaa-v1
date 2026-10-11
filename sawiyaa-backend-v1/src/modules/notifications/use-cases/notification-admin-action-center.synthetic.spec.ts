import { NotificationStatus } from '@prisma/client';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { NotificationContextEnrichmentService } from '../services/notification-context-enrichment.service';
import { ListAdminActionCenterItemsUseCase } from './list-admin-action-center-items.use-case';

describe('Notification Admin Action Center synthetic projection', () => {
  it('keeps 1,000 participant reminders out of Action Center without enriching them', async () => {
    const participantReminders = Array.from({ length: 1000 }, (_, index) => ({
      id: `reminder-${index + 1}`,
      userId: index % 2 === 0 ? 'patient-1' : 'practitioner-1',
      typeSlug:
        index % 2 === 0
          ? 'sessions.session-reminder-15'
          : 'sessions.session-reminder-60',
      status: NotificationStatus.SENT,
    }));
    const listAdminActionCenterNotifications = jest
      .fn()
      .mockResolvedValue([[], 0]);
    const listAdminOperationalNotifications = jest
      .fn()
      .mockResolvedValue([participantReminders, participantReminders.length]);
    const repository = {
      listAdminActionCenterNotifications,
      listAdminOperationalNotifications,
    } as unknown as OperationalNotificationRepository;
    const presenter = {
      toListItem: jest.fn(),
      presentPagination: jest.fn().mockReturnValue({
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 1,
      }),
    } as unknown as NotificationOpsPresenter;
    const enrichMany = jest.fn().mockResolvedValue(new Map());
    const enrichmentService = {
      enrichMany,
    } as unknown as NotificationContextEnrichmentService;
    const useCase = new ListAdminActionCenterItemsUseCase(
      repository,
      presenter,
      enrichmentService,
    );

    const actionCenterResult = await useCase.execute({
      authenticatedUserId: 'reviewer-1',
      query: {},
    });
    const [deliveryRows, deliveryCount] =
      (await listAdminOperationalNotifications()) as [
        typeof participantReminders,
        number,
      ];

    expect(actionCenterResult.items).toEqual([]);
    expect(actionCenterResult.pagination.totalItems).toBe(0);
    expect(enrichMany).toHaveBeenCalledWith([]);
    expect(listAdminActionCenterNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        typeSlugs: ['moderation.report-created'],
        userId: 'reviewer-1',
      }),
    );
    expect(deliveryRows).toHaveLength(1000);
    expect(deliveryCount).toBe(1000);
  });
});
