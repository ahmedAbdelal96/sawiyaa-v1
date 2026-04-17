import { ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { AdminNotificationOpsController } from './admin-notification-ops.controller';

describe('AdminNotificationOpsController', () => {
  const listUseCase = {
    execute: jest.fn().mockResolvedValue({ items: [], pagination: {} }),
  } as never;
  const detailUseCase = {
    execute: jest.fn().mockResolvedValue({ item: { id: 'n1' } }),
  } as never;

  const controller = new AdminNotificationOpsController(listUseCase, detailUseCase);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes admin/support role metadata for ops routes', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminNotificationOpsController);
    expect(roles).toEqual([AppRole.ADMIN, AppRole.SUPPORT_AGENT]);
  });

  it('delegates list request to list use case', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);

    expect(listUseCase.execute).toHaveBeenCalledWith({ query });
  });

  it('delegates details request to detail use case', async () => {
    await controller.details('n1');

    expect(detailUseCase.execute).toHaveBeenCalledWith({
      notificationId: 'n1',
    });
  });
});
