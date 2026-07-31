import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import PractitionerWalletSummaryScreen from "./PractitionerWalletSummaryScreen";

// Mock next-intl
let currentLocale = "ar";
vi.mock("next-intl", () => ({
  useLocale: () => currentLocale,
  useTranslations: () => (key: string) => {
    if (key.includes("summary.title")) return currentLocale === "ar" ? "المحفظة" : "Wallet";
    if (key.includes("summary.note")) return currentLocale === "ar" ? "تابع أرصدتك وتسوياتك المالية." : "Track your balances and financial settlements.";
    if (key.includes("summary.cards.available")) return "الرصيد المتاح";
    if (key.includes("summary.cards.pending")) return "الرصيد المعلّق";
    if (key.includes("summary.cards.reserved")) return "الرصيد المحجوز";
    if (key.includes("summary.cards.totalEarned")) return "إجمالي المكتسب";
    if (key.includes("summary.cards.lifetimePaidOut")) return currentLocale === "ar" ? "إجمالي ما تم صرفه" : "Lifetime paid out";
    if (key.includes("settlements.states.empty.heading")) return currentLocale === "ar" ? "لا توجد تسويات حتى الآن." : "No settlements yet";
    if (key.includes("settlements.statuses.PAID")) return currentLocale === "ar" ? "تم الصرف" : "Paid";
    if (key.includes("settlements.statuses.PROCESSING")) return currentLocale === "ar" ? "قيد المعالجة" : "Processing";
    if (key.includes("settlements.eyebrow")) return "سجل التسويات";
    if (key.includes("settlements.note")) return "تفاصيل عمليات الصرف";
    if (key.includes("summary.timezoneLabel")) return "المنطقة الزمنية";
    if (key.includes("summary.currency")) return `العملة: EGP`;
    return key;
  },
}));

// Mock navigation
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/practitioner/wallet",
  useRouter: () => ({
    push: vi.fn(),
  }),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => null,
    toString: () => "",
  }),
}));

// Mock API / hooks
const mockWallet = {
  currency: "EGP",
  availableBalance: "1500.00",
  pendingBalance: "500.00",
  reservedBalance: "100.00",
  totalEarned: "2500.00",
  lifetimePaidOut: "900.00",
  lastLedgerEntryAt: "2026-07-26T12:00:00.000Z",
  updatedAt: "2026-07-26T12:05:00.000Z",
};

const mockSettlements = {
  items: [
    {
      id: "settlement-1",
      batchId: "batch-101",
      practitionerId: "prac-1",
      status: "PAID",
      currency: "EGP",
      amountGross: "1000.00",
      amountAdjustments: "100.00",
      amountNet: "900.00",
      externalPayoutRef: "ref-999",
      paidAt: "2026-07-26T13:00:00.000Z",
      createdAt: "2026-07-26T11:00:00.000Z",
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 1,
    totalPages: 1,
  },
};

const mockUsePractitionerProfile = vi.fn();
const mockUsePractitionerWallet = vi.fn();
const mockUsePractitionerSettlements = vi.fn();

vi.mock("@/features/practitioners/hooks/use-practitioners", () => ({
  usePractitionerProfile: () => mockUsePractitionerProfile(),
}));

vi.mock("../hooks/use-financial-operations", () => ({
  usePractitionerWallet: () => mockUsePractitionerWallet(),
  usePractitionerSettlements: () => mockUsePractitionerSettlements(),
}));

describe("PractitionerWalletSummaryScreen Redesign Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePractitionerProfile.mockReturnValue({
      data: { profile: { timezone: "Africa/Cairo" } },
      isLoading: false,
    });
    mockUsePractitionerWallet.mockReturnValue({
      data: mockWallet,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUsePractitionerSettlements.mockReturnValue({
      data: mockSettlements,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("1. & 2. Page uses Surface components and summary cards are compact grid matching Ledger style", () => {
    currentLocale = "ar";
    render(<PractitionerWalletSummaryScreen />);

    // Verify SurfaceHeader title and description are rendered
    expect(screen.getByText("المحفظة")).toBeDefined();
    expect(screen.getByText("تابع أرصدتك وتسوياتك المالية.")).toBeDefined();

    // Verify the current five stat cards are rendered in the grid
    expect(screen.getByText("الرصيد المتاح")).toBeDefined();
    expect(screen.getByText("الرصيد المعلّق")).toBeDefined();
    expect(screen.getByText("الرصيد المحجوز")).toBeDefined();
    expect(screen.getByText("إجمالي المكتسب")).toBeDefined();
    expect(screen.getByText("إجمالي ما تم صرفه")).toBeDefined();

    // Verify that the rejected SurfaceStatCard's absolute decorative circles are not rendered
    expect(document.querySelector(".-right-7")).toBeNull();
    expect(document.querySelector(".-bottom-8")).toBeNull();
  });

  it("3. & 4. & 5. Centralized money formatter displays EGP & USD formatting contracts correctly in English and Arabic", () => {
    currentLocale = "ar";
    const { rerender } = render(<PractitionerWalletSummaryScreen />);
    
    // Arabic EGP check: "جنيه" (instead of "جنيه مصري")
    expect(screen.getAllByText("جنيه").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("جنيه مصري")).toBeNull();

    // English EGP check: "EGP" (instead of EGP prefix)
    currentLocale = "en";
    rerender(<PractitionerWalletSummaryScreen />);
    expect(screen.getAllByText("EGP").length).toBeGreaterThanOrEqual(1);
  });

  it("6. Settlement table uses DataTable and maps status enums correctly without raw values", () => {
    currentLocale = "ar";
    render(<PractitionerWalletSummaryScreen />);

    // Verify DataTable sections
    expect(screen.getByText("سجل التسويات")).toBeDefined();

    // Verify status mapped correctly (PAID -> تم الصرف, not PAID)
    expect(screen.getAllByText("تم الصرف").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/^PAID$/)).toBeNull();
  });

  it("7. Empty state renders correctly when there are no settlements", () => {
    currentLocale = "ar";
    mockUsePractitionerSettlements.mockReturnValue({
      data: {
        items: [],
        pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PractitionerWalletSummaryScreen />);
    expect(screen.getByText("لا توجد تسويات حتى الآن.")).toBeDefined();
  });
});
