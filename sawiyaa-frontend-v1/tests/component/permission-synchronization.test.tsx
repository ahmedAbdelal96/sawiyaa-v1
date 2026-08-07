import { describe, expect, it } from "vitest";
import {
  PermissionKey,
  getDefaultPermissionsForRoles,
} from "@/lib/auth/permissions";
import {
  ADMIN_PERMISSION_CATALOG,
  ADMIN_PERMISSION_GROUP_ORDER,
  getPermissionCatalogByModule,
} from "@/features/admin/users/constants/admin-permission-catalog";

describe("frontend permission synchronization", () => {
  it("mirrors the backend permission keys", () => {
    expect(PermissionKey.FINANCIAL_PACKAGE_SETTLEMENT_RELEASE).toBe(
      "financial.package-settlement.release",
    );
    expect(PermissionKey.ACADEMY_ENROLLMENTS_CREATE_MANUAL).toBe(
      "academy.enrollments.create.manual",
    );
  });

  it("exposes both new permissions in the assignment catalog", () => {
    const packageSettlement = ADMIN_PERMISSION_CATALOG.find(
      (item) => item.key === PermissionKey.FINANCIAL_PACKAGE_SETTLEMENT_RELEASE,
    );
    const academyEnrollment = ADMIN_PERMISSION_CATALOG.find(
      (item) => item.key === PermissionKey.ACADEMY_ENROLLMENTS_CREATE_MANUAL,
    );

    expect(packageSettlement).toMatchObject({
      module: "settlements",
      labelKey: "permissions.financialPackageSettlementRelease.label",
      risk: "critical",
    });
    expect(academyEnrollment).toMatchObject({
      module: "academy",
      labelKey: "permissions.academyEnrollmentsCreateManual.label",
      risk: "critical",
    });
    expect(ADMIN_PERMISSION_GROUP_ORDER).toContain("academy");
  });

  it("groups new permissions into their visible modules", () => {
    const groups = getPermissionCatalogByModule();

    expect(groups.get("settlements")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: PermissionKey.FINANCIAL_PACKAGE_SETTLEMENT_RELEASE,
        }),
      ]),
    );
    expect(groups.get("academy")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: PermissionKey.ACADEMY_ENROLLMENTS_CREATE_MANUAL,
        }),
      ]),
    );
  });

  it("matches backend ADMIN role defaults without granting specialized roles", () => {
    const adminDefaults = getDefaultPermissionsForRoles(["ADMIN"]);
    const financeDefaults = getDefaultPermissionsForRoles(["FINANCE_STAFF"]);

    expect(
      adminDefaults.has(PermissionKey.FINANCIAL_PACKAGE_SETTLEMENT_RELEASE),
    ).toBe(true);
    expect(
      adminDefaults.has(PermissionKey.ACADEMY_ENROLLMENTS_CREATE_MANUAL),
    ).toBe(true);
    expect(financeDefaults).not.toContain(
      PermissionKey.ACADEMY_ENROLLMENTS_CREATE_MANUAL,
    );
  });
});
