import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { AdminPractitionerPayoutsController } from './admin-practitioner-payouts.controller';

const getControllerMethod = (
  name: keyof AdminPractitionerPayoutsController,
) =>
  (
    AdminPractitionerPayoutsController.prototype as unknown as Record<
      string,
      unknown
    >
  )[name] as (...args: never[]) => unknown;

describe('AdminPractitionerPayoutsController proof access contract', () => {
  it('keeps the financial authentication and authorization guards', () => {
    const guards = (Reflect.getMetadata(
      GUARDS_METADATA,
      AdminPractitionerPayoutsController,
    ) ?? []) as unknown[];

    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(guards).toContain(PermissionsGuard);
  });

  it('allows only the existing financial admin roles', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AdminPractitionerPayoutsController,
    ) as AppRole[] | undefined;

    expect(roles).toEqual(
      expect.arrayContaining([
        AppRole.ADMIN,
        AppRole.SUPER_ADMIN,
        AppRole.FINANCE_STAFF,
      ]),
    );
    expect(roles).not.toContain(AppRole.PRACTITIONER);
  });

  it('allows proof upload for authorized finance operators without an ADMIN-only guard', () => {
    const method = getControllerMethod('uploadProof');
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as
      | PermissionKey[]
      | undefined;
    const guards = (Reflect.getMetadata(GUARDS_METADATA, method) ?? []) as unknown[];

    expect(permissions).toEqual([PermissionKey.FINANCIAL_PAYOUT_EXECUTE]);
    expect(guards).not.toContain(AdminGuard);
  });

  it('keeps proof retrieval on the controller payout-read contract', () => {
    const method = getControllerMethod('getProof');
    expect(Reflect.getMetadata(PERMISSIONS_KEY, method)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, method)).toBeUndefined();
  });
});
