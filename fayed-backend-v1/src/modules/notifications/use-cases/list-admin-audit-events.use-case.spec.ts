import { AdminAuditPresenter } from '../presenters/admin-audit.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { ListAdminAuditEventsUseCase } from './list-admin-audit-events.use-case';

describe('ListAdminAuditEventsUseCase', () => {
  const repository = {
    listAdminAuditEvents: jest.fn(),
  } as unknown as OperationalNotificationRepository;

  const presenter = {
    toListItem: jest.fn().mockImplementation((value) => value),
    presentPagination: jest.fn().mockReturnValue({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    }),
  } as unknown as AdminAuditPresenter;

  const useCase = new ListAdminAuditEventsUseCase(repository, presenter);

  beforeEach(() => {
    jest.clearAllMocks();
    (repository.listAdminAuditEvents as jest.Mock).mockResolvedValue([[], 0]);
  });

  it('delegates query parameters to repository with defaults', async () => {
    await useCase.execute({ query: {} });

    expect(repository.listAdminAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );
  });
});
