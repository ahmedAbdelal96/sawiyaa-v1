import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY, ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminPaymentOperationalExceptionsController } from './admin-payment-operational-exceptions.controller';

const methodMetadata = (name: keyof AdminPaymentOperationalExceptionsController, key: string) =>
  Reflect.getMetadata(key, AdminPaymentOperationalExceptionsController.prototype[name]);

describe('Admin payment exception access contract', () => {
  it('keeps support outside financial exception access', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminPaymentOperationalExceptionsController) as AppRole[];
    expect(roles).toEqual([AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF]);
  });

  it('requires FINANCE_EVENTS_READ to read and ACCOUNTING_WRITE to mutate', () => {
    expect(methodMetadata('list', PERMISSIONS_KEY)).toEqual([PermissionKey.FINANCE_EVENTS_READ]);
    expect(methodMetadata('get', PERMISSIONS_KEY)).toEqual([PermissionKey.FINANCE_EVENTS_READ]);
    expect(methodMetadata('create', PERMISSIONS_KEY)).toEqual([PermissionKey.ACCOUNTING_WRITE]);
    expect(methodMetadata('resolve', PERMISSIONS_KEY)).toEqual([PermissionKey.ACCOUNTING_WRITE]);
  });

  it('keeps authentication and authorization guards enabled', () => {
    const guards = (Reflect.getMetadata(GUARDS_METADATA, AdminPaymentOperationalExceptionsController) ?? []) as unknown[];
    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(guards).toContain(PermissionsGuard);
  });
});
