import { NotFoundException } from '@nestjs/common';
import { AdminAuditPresenter } from '../presenters/admin-audit.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { GetAdminAuditEventDetailsUseCase } from './get-admin-audit-event-details.use-case';

describe('GetAdminAuditEventDetailsUseCase', () => {
  const repository = {
    findAdminAuditEventById: jest.fn(),
  } as unknown as OperationalNotificationRepository;

  const presenter = {
    toDetailItem: jest.fn().mockReturnValue({ id: 'evt1' }),
  } as unknown as AdminAuditPresenter;

  const useCase = new GetAdminAuditEventDetailsUseCase(repository, presenter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns details when audit event exists', async () => {
    (repository.findAdminAuditEventById as jest.Mock).mockResolvedValue({ id: 'evt1' });

    const result = await useCase.execute({ eventId: 'evt1' });

    expect(result).toEqual({ item: { id: 'evt1' } });
  });

  it('throws not found for missing audit event', async () => {
    (repository.findAdminAuditEventById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute({ eventId: 'missing' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
