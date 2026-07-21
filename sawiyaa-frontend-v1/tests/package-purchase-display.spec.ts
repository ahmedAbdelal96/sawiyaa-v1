import { expect, test } from "@playwright/test";
import {
  getPackagePurchaseStatusConfig,
  formatPackageDisplayTitle,
  getPackagePurchaseCompletionCount,
  isPackagePurchasePaymentExpired,
} from "../src/features/package-plans/lib/package-purchase-display";

test.describe("package-purchase-display helpers", () => {
  test("returns correct label key and tone for ACTIVE status", () => {
    const config = getPackagePurchaseStatusConfig("ACTIVE");
    expect(config.labelKey).toBe("list.status.ACTIVE");
    expect(config.tone).toBe("success");
  });

  test("returns correct label key and tone for PENDING_PAYMENT status", () => {
    const config = getPackagePurchaseStatusConfig("PENDING_PAYMENT");
    expect(config.labelKey).toBe("list.status.PENDING_PAYMENT");
    expect(config.tone).toBe("warning");
  });

  test("returns correct label key and tone for COMPLETED status", () => {
    const config = getPackagePurchaseStatusConfig("COMPLETED");
    expect(config.labelKey).toBe("list.status.COMPLETED");
    expect(config.tone).toBe("dark");
  });

  test("returns neutral fallback for unknown status without exposing raw string", () => {
    const config = getPackagePurchaseStatusConfig("UNKNOWN_XYZ" as any);
    expect(config.labelKey).toBe("list.status.ACTIVE");
    expect(config.tone).toBe("light");
  });

  test("prioritizes persisted title snapshot when present", () => {
    const mockT = (key: string, values?: Record<string, any>) => {
      if (key === "list.table.packageSessionsLabel") {
        return `باقة من ${values?.sessions} جلسات`;
      }
      return key;
    };
    const result = formatPackageDisplayTitle({
      title: "باقة الدعم المتكامل",
      sessionCount: 6,
      t: mockT,
    });
    expect(result).toBe("باقة الدعم المتكامل");
  });

  test("falls back to localized session count label when title snapshot is missing", () => {
    const mockT = (key: string, values?: Record<string, any>) => {
      if (key === "list.table.packageSessionsLabel") {
        return `باقة من ${values?.sessions} جلسات`;
      }
      return key;
    };
    const result = formatPackageDisplayTitle({
      title: null,
      sessionCount: 4,
      t: mockT,
    });
    expect(result).toBe("باقة من 4 جلسات");
    expect(result).not.toContain("SESSIONS_4");
  });

  test("uses canonical progress completedSessions if available", () => {
    const purchase: any = {
      progress: { completedSessions: 3, totalSessions: 6 },
      linkedSessions: { items: [] },
    };
    expect(getPackagePurchaseCompletionCount(purchase)).toBe(3);
  });

  test("falls back to counting COMPLETED linked sessions when progress is missing", () => {
    const purchase: any = {
      progress: null,
      linkedSessions: {
        items: [
          { status: "COMPLETED" },
          { status: "COMPLETED" },
          { status: "UPCOMING" },
        ],
      },
    };
    expect(getPackagePurchaseCompletionCount(purchase)).toBe(2);
  });

  test("returns true when payment window has passed for PENDING_PAYMENT", () => {
    const purchase: any = {
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date(Date.now() - 10000).toISOString(),
    };
    expect(isPackagePurchasePaymentExpired(purchase)).toBe(true);
  });

  test("returns false for ACTIVE purchases regardless of date", () => {
    const purchase: any = {
      status: "ACTIVE",
      paymentExpiresAt: new Date(Date.now() - 10000).toISOString(),
    };
    expect(isPackagePurchasePaymentExpired(purchase)).toBe(false);
  });
});
