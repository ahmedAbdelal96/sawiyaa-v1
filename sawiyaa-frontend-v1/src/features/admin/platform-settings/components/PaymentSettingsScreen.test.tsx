import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentSettingsScreen from "./PaymentSettingsScreen";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "ar",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../hooks/use-platform-settings", () => ({
  usePlatformSettings: mocks.settings,
  useUpdatePlatformSetting: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/features/admin/payment-gateway-control/components/AdminPaymentGatewayControlScreen", () => ({
  default: () => <div data-testid="automatic-payment-settings" />,
}));

vi.mock("@/features/admin/manual-payments/components/AdminManualPaymentsScreen", () => ({
  default: ({ mode }: { mode: string }) => (
    <div data-testid={`manual-payments-${mode}`} />
  ),
}));

describe("PaymentSettingsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutateAsync.mockResolvedValue({});
    mocks.settings.mockReturnValue({
      data: {
        settings: [
          {
            key: "payments.manualPayment.enabledDomains",
            value: ["ACADEMY", "PACKAGES"],
            expectedUpdatedAt: "2026-10-12T00:00:00.000Z",
            capabilities: { canEdit: true },
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
  });

  it("keeps automatic and manual payment settings under one canonical workspace", () => {
    render(<PaymentSettingsScreen activeTab="automatic" />);

    expect(screen.getByTestId("automatic-payment-settings")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "paymentsSettings.manualTab" })).toHaveAttribute(
      "href",
      "/admin/platform-settings/payments?tab=manual",
    );
  });

  it("updates Academy manual availability through the backend-owned setting", async () => {
    const user = userEvent.setup();
    render(<PaymentSettingsScreen activeTab="manual" />);

    await user.click(screen.getByRole("switch"));

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      key: "payments.manualPayment.enabledDomains",
      value: ["PACKAGES"],
      reason: "تحديث إتاحة الدفع اليدوي للتدريب من إعدادات الدفع",
      expectedUpdatedAt: "2026-10-12T00:00:00.000Z",
    });
    expect(screen.getByTestId("manual-payments-configuration")).toBeTruthy();
  });
});
