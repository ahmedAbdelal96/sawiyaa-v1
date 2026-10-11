import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { AdminNotificationOpsController } from './admin-notification-ops.controller';

describe('AdminNotificationOpsController', () => {
  const listUseCase = {
    execute: jest.fn().mockResolvedValue({ items: [], pagination: {} }),
  } as never;
  const detailUseCase = {
    execute: jest.fn().mockResolvedValue({ item: { id: 'n1' } }),
  } as never;
  const actionCenterUseCase = {
    execute: jest.fn().mockResolvedValue({ items: [], pagination: {} }),
  } as never;
  const devTestPushUseCase = {
    execute: jest.fn().mockResolvedValue({}),
  } as never;

  const controller = new AdminNotificationOpsController(
    listUseCase,
    actionCenterUseCase,
    detailUseCase,
    devTestPushUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes admin/support role metadata for ops routes', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AdminNotificationOpsController,
    ) as AppRole[];
    expect(roles).toEqual([
      AppRole.ADMIN,
      AppRole.SUPER_ADMIN,
      AppRole.MARKETING_STAFF,
      AppRole.PATIENT_OPERATIONS,
    ]);

    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      AdminNotificationOpsController,
    ) as PermissionKey[];
    expect(permissions).toEqual([PermissionKey.NOTIFICATION_OPS_READ]);
  });

  it('delegates list request to list use case', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);

    expect(listUseCase.execute).toHaveBeenCalledWith({ query });
  });

  it('delegates Action Center requests with the authenticated reviewer id', async () => {
    const query = { page: 1, limit: 20 };
    await controller.actionCenter(
      { id: 'reviewer-1' } as never,
      query as never,
    );

    expect(actionCenterUseCase.execute).toHaveBeenCalledWith({
      authenticatedUserId: 'reviewer-1',
      query,
    });
  });

  it('delegates details request to detail use case', async () => {
    await controller.details('n1');

    expect(detailUseCase.execute).toHaveBeenCalledWith({
      notificationId: 'n1',
    });
  });
});
