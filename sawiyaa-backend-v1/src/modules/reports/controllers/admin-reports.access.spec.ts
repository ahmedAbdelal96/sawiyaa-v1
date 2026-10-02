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
import { AdminPaymentsRevenueReportController } from './admin-payments-revenue-report.controller';
import { AdminPayoutsReportController } from './admin-payouts-report.controller';
import { AdminSessionsReportController } from './admin-sessions-report.controller';
import { AdminCareRequestsReportController } from './admin-care-requests-report.controller';

describe('Admin report access contracts', () => {
  it('requires accounting permission for payments/revenue reports', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminPaymentsRevenueReportController),
    ).toEqual([AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AdminPaymentsRevenueReportController,
      ),
    ).toEqual([PermissionKey.ACCOUNTING_READ]);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        AdminPaymentsRevenueReportController,
      ),
    ).toEqual(
      expect.arrayContaining([
        JwtAccessAuthGuard,
        RolesGuard,
        PermissionsGuard,
      ]),
    );
  });

  it('requires payout-read permission for practitioner payout reports', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminPayoutsReportController),
    ).toEqual([AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, AdminPayoutsReportController),
    ).toEqual([PermissionKey.PRACTITIONER_PAYOUTS_READ]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminPayoutsReportController),
    ).toEqual(
      expect.arrayContaining([
        JwtAccessAuthGuard,
        RolesGuard,
        PermissionsGuard,
      ]),
    );
  });

  it('requires admin session-read permission for session report rows', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminSessionsReportController),
    ).toEqual([AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.PATIENT_OPERATIONS]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, AdminSessionsReportController),
    ).toEqual([PermissionKey.SESSIONS_READ_ADMIN]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminSessionsReportController),
    ).toEqual(
      expect.arrayContaining([
        JwtAccessAuthGuard,
        RolesGuard,
        PermissionsGuard,
      ]),
    );
  });

  it('keeps care-request reporting available only to roles with the care-request read grant', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminCareRequestsReportController),
    ).toEqual([AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.SUPPORT_AGENT]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, AdminCareRequestsReportController),
    ).toEqual([PermissionKey.CARE_CHAT_REQUEST_READ_ADMIN]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminCareRequestsReportController),
    ).toEqual(
      expect.arrayContaining([
        JwtAccessAuthGuard,
        RolesGuard,
        PermissionsGuard,
      ]),
    );
  });
});
