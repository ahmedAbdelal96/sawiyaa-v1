import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '@common/constants/auth-metadata.constants';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { AdminModerationReportsController } from './admin-moderation-reports.controller';

describe('AdminModerationReportsController authorization', () => {
  it('applies the backend permissions guard at controller scope', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AdminModerationReportsController,
    );

    expect(guards).toContain(PermissionsGuard);
  });

  it('requires report view permission for the queue', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      AdminModerationReportsController.prototype.list,
    );

    expect(permissions).toEqual([PermissionKey.MODERATION_REPORT_VIEW]);
  });

  it('requires evidence permission for report detail', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      AdminModerationReportsController.prototype.getById,
    );

    expect(permissions).toEqual([
      PermissionKey.MODERATION_REPORT_VIEW,
      PermissionKey.MODERATION_EVIDENCE_VIEW,
    ]);
  });

  it('requires action permission for mutations', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      AdminModerationReportsController.prototype.executeAction,
    );

    expect(permissions).toEqual([PermissionKey.MODERATION_ACTION_EXECUTE]);
  });
});
