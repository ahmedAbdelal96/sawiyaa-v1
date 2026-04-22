import { ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { AdminAuditLogController } from './admin-audit-log.controller';

describe('AdminAuditLogController', () => {
  const listUseCase = {
    execute: jest.fn().mockResolvedValue({ items: [], pagination: {} }),
  } as never;
  const detailUseCase = {
    execute: jest.fn().mockResolvedValue({ item: { id: 'evt1' } }),
  } as never;

  const controller = new AdminAuditLogController(listUseCase, detailUseCase);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes admin/support role metadata for audit routes', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminAuditLogController);
    expect(roles).toEqual([AppRole.ADMIN, AppRole.SUPPORT_AGENT]);
  });

  it('delegates list request to list use case', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);

    expect(listUseCase.execute).toHaveBeenCalledWith({ query });
  });

  it('delegates details request to detail use case', async () => {
    await controller.details('evt1');

    expect(detailUseCase.execute).toHaveBeenCalledWith({
      eventId: 'evt1',
    });
  });
});
