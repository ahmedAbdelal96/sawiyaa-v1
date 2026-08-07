import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminFinancialOverviewCards from "./AdminFinancialOverviewCards";
import type { AdminFinancialOverview } from "../types/admin-finance-summary.types";

const mockMetrics: AdminFinancialOverview["metrics"] = {
  grossPatientCollections: [{ currency: "EGP", amount: "15000", count: 120 }, { currency: "USD", amount: "800", count: 15 }],
  patientWalletCredits: [{ currency: "EGP", amount: "2000", count: 40 }],
  completedServiceEconomicValue: [{ currency: "EGP", amount: "13000", count: 110 }],
  awaitingAccountantReview: [{ currency: "EGP", amount: "5000", count: 25 }],
  awaitingAccountantReviewSuggestedPractitioner: [{ currency: "EGP", amount: "4000", count: 25 }],
  accountantApprovedAwaitingWalletCredit: [{ currency: "EGP", amount: "3000", count: 18 }],
  accountantApprovedAlreadyWalletCredited: [{ currency: "EGP", amount: "6000", count: 32 }],
  practitionerWalletCredits: [{ currency: "EGP", amount: "8000", count: 45 }],
  outstandingPractitionerWalletLiability: [{ currency: "EGP", amount: "4000", count: 22 }],
  availableForPayout: [{ currency: "EGP", amount: "3500", count: 10 }],
  currentPractitionerWalletBalances: [{ currency: "EGP", amount: "7500", count: 45, availableAmount: "5000", lockedOrReservedAmount: "2500" }],
  completedExternalPractitionerPayouts: [{ currency: "EGP", amount: "9000", count: 30 }],
  completedExternalPayoutDebits: [{ currency: "EGP", amount: "9000", count: 30 }],
  pendingExternalPractitionerPayouts: [{ currency: "EGP", amount: "1500", count: 5 }],
  failedOrReversedExternalPayouts: [{ currency: "EGP", amount: "500", count: 2 }],
  platformSuggestedShare: [{ currency: "EGP", amount: "1000", count: 25 }],
  platformRemainderAfterDecision: [{ currency: "EGP", amount: "1000", count: 25 }],
  accountingAdditions: [{ currency: "EGP", amount: "200", count: 3 }],
  accountingDeductions: [{ currency: "EGP", amount: "100", count: 2 }],
  rejectedOrExcludedCandidates: [{ currency: "EGP", amount: "400", count: 4 }],
  paymentStatusCounts: [{ status: "CAPTURED", currency: "EGP", count: 120 }],
};

// Mock useAdminFinancialOverview hook
vi.mock("../hooks/use-admin-finance-summary", () => ({
  useAdminFinancialOverview: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    data: {
      metrics: mockMetrics,
    },
  }),
}));

// Mock next/navigation (partial mocking)
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useSearchParams: () => ({
      get: () => null,
    }),
  };
});

// Mock next-intl using the actual English messages file to check translation keys validity
vi.mock("next-intl", () => {
  const messages = require("../../../../../messages/en/admin-accounting.json");
  return {
    useTranslations: () => {
      return (key: string) => {
        const keys = key.split(".");
        let obj: any = messages;
        for (const k of keys) {
          if (obj && typeof obj === "object" && k in obj) {
            obj = obj[k];
          } else {
            return `[admin-accounting.${key}]`;
          }
        }
        return typeof obj === "string" ? obj : `[admin-accounting.${key}]`;
      };
    },
    useLocale: () => "en",
  };
});

describe("AdminFinancialOverviewCards i18n key guard test", () => {
  it("renders collections variant and has zero raw keys", () => {
    const { container } = render(
      <AdminFinancialOverviewCards scope="collections" variant="collections" />
    );

    // Verify no missing key warnings in output
    const html = container.innerHTML;
    expect(html).not.toContain("[admin-accounting.");
  });

  it("renders reviews variant and has zero raw keys", () => {
    const { container } = render(
      <AdminFinancialOverviewCards scope="accounting" variant="reviews" />
    );

    const html = container.innerHTML;
    expect(html).not.toContain("[admin-accounting.");
  });

  it("renders wallets variant and has zero raw keys", () => {
    const { container } = render(
      <AdminFinancialOverviewCards scope="wallets" variant="wallets" />
    );

    const html = container.innerHTML;
    expect(html).not.toContain("[admin-accounting.");
  });

  it("renders payouts variant and has zero raw keys", () => {
    const { container } = render(
      <AdminFinancialOverviewCards scope="payouts" variant="payouts" />
    );

    const html = container.innerHTML;
    expect(html).not.toContain("[admin-accounting.");
  });
});
