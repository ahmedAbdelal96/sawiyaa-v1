import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '@common/constants/auth-metadata.constants';
import { STEP_UP_POLICY_KEY } from '@common/decorators/step-up.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminSettlementsController } from './admin-settlements.controller';

const getControllerMethod = (name: keyof AdminSettlementsController) =>
  (AdminSettlementsController.prototype as unknown as Record<string, unknown>)[
    name
  ] as (...args: never[]) => unknown;

describe('AdminSettlementsController access contract', () => {
  it('exposes list/detail visibility to admin/support operator roles', () => {
    const classRoles = Reflect.getMetadata(
      ROLES_KEY,
      AdminSettlementsController,
    ) as AppRole[] | undefined;
    expect(classRoles).toEqual([
      AppRole.ADMIN,
      AppRole.SUPER_ADMIN,
      AppRole.FINANCE_STAFF,
    ]);

    const classPermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      AdminSettlementsController,
    ) as PermissionKey[] | undefined;
    expect(classPermissions).toEqual([PermissionKey.SETTLEMENTS_READ]);
  });

  it('keeps settlement mutation routes admin-only', () => {
    const generate = getControllerMethod('generate');
    const markPaid = getControllerMethod('markPaid');
    const markFailed = getControllerMethod('markFailed');
    const recordPractitionerPayout = getControllerMethod(
      'recordPractitionerPayout',
    );

    const generateRoles = Reflect.getMetadata(ROLES_KEY, generate) as
      | AppRole[]
      | undefined;
    const markPaidRoles = Reflect.getMetadata(ROLES_KEY, markPaid) as
      | AppRole[]
      | undefined;
    const markFailedRoles = Reflect.getMetadata(ROLES_KEY, markFailed) as
      | AppRole[]
      | undefined;
    const recordPractitionerPayoutRoles = Reflect.getMetadata(
      ROLES_KEY,
      recordPractitionerPayout,
    ) as AppRole[] | undefined;
    const generatePermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      generate,
    ) as PermissionKey[] | undefined;
    const markPaidPermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      markPaid,
    ) as PermissionKey[] | undefined;
    const markFailedPermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      markFailed,
    ) as PermissionKey[] | undefined;
    const recordPractitionerPayoutPermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      recordPractitionerPayout,
    ) as PermissionKey[] | undefined;

    expect(generateRoles).toEqual([AppRole.ADMIN]);
    expect(markPaidRoles).toEqual([AppRole.ADMIN]);
    expect(markFailedRoles).toEqual([AppRole.ADMIN]);
    expect(recordPractitionerPayoutRoles).toEqual([AppRole.ADMIN]);

    expect(generatePermissions).toEqual([PermissionKey.SETTLEMENTS_WRITE]);
    expect(markPaidPermissions).toEqual([PermissionKey.SETTLEMENTS_WRITE]);
    expect(markFailedPermissions).toEqual([PermissionKey.SETTLEMENTS_WRITE]);
    expect(recordPractitionerPayoutPermissions).toEqual([
      PermissionKey.SETTLEMENTS_WRITE,
    ]);

    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, generate)).toBe(
      'finance.settlement.generate',
    );
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, markPaid)).toBe(
      'finance.settlement.mark-paid',
    );
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, markFailed)).toBe(
      'finance.settlement.mark-failed',
    );
  });

  it('enforces auth/role guards at controller level and admin guard on mutation routes', () => {
    const classGuards = (Reflect.getMetadata(
      GUARDS_METADATA,
      AdminSettlementsController,
    ) ?? []) as unknown[];
    expect(classGuards).toContain(JwtAccessAuthGuard);
    expect(classGuards).toContain(RolesGuard);
    expect(classGuards).toContain(PermissionsGuard);

    const generate = getControllerMethod('generate');
    const markPaid = getControllerMethod('markPaid');
    const markFailed = getControllerMethod('markFailed');
    const recordPractitionerPayout = getControllerMethod(
      'recordPractitionerPayout',
    );

    const generateGuards = (Reflect.getMetadata(GUARDS_METADATA, generate) ??
      []) as unknown[];
    const markPaidGuards = (Reflect.getMetadata(GUARDS_METADATA, markPaid) ??
      []) as unknown[];
    const markFailedGuards = (Reflect.getMetadata(
      GUARDS_METADATA,
      markFailed,
    ) ?? []) as unknown[];
    const recordPractitionerPayoutGuards = (Reflect.getMetadata(
      GUARDS_METADATA,
      recordPractitionerPayout,
    ) ?? []) as unknown[];

    expect(generateGuards).toContain(AdminGuard);
    expect(markPaidGuards).toContain(AdminGuard);
    expect(markFailedGuards).toContain(AdminGuard);
    expect(recordPractitionerPayoutGuards).toContain(AdminGuard);
  });
});
