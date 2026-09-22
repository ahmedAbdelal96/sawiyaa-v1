import { describe, expect, it } from "vitest";
import { ADMIN_PERMISSION_CATALOG } from "./admin-permission-catalog";
import { PermissionKey } from "@/lib/auth/permissions";

describe("P1 admin permission catalog", () => {
  it("contains every approved key exactly once with read/manage labels", () => {
    const expected = [
      PermissionKey.ARTICLES_READ,
      PermissionKey.ARTICLES_MANAGE,
      PermissionKey.HELP_READ,
      PermissionKey.HELP_MANAGE,
      PermissionKey.REVIEWS_READ,
      PermissionKey.REVIEWS_MODERATE,
      PermissionKey.SPECIALTIES_READ,
      PermissionKey.SPECIALTIES_MANAGE,
      PermissionKey.PACKAGE_PLANS_READ,
      PermissionKey.PACKAGE_PLANS_MANAGE,
      PermissionKey.ASSESSMENTS_AUTHORING_READ,
      PermissionKey.ASSESSMENTS_AUTHORING_MANAGE,
      PermissionKey.CUSTOMER_WALLETS_READ,
      PermissionKey.COUPONS_MANAGE,
    ];
    for (const key of expected)
      expect(
        ADMIN_PERMISSION_CATALOG.filter((item) => item.key === key),
      ).toHaveLength(1);
  });
});
