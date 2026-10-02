import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformPaymentsDomain from "./PlatformPaymentsDomain";
import type { PlatformSetting } from "../../types/platform-settings.types";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key} (${params.count})`;
    return key;
  },
  useLocale: () => "ar",
}));

vi.mock("../../hooks/use-platform-settings", () => ({
  useUpdatePlatformSetting: mocks.update,
  useResetPlatformSetting: mocks.reset,
}));

const mockPaymentSettings: PlatformSetting[] = [
  {
    key: "payment.provider.paymob.enabled",
    label: "Paymob Provider Enabled",
    labelAr: "تفعيل بوابة باي موب",
    description: "Controls whether Paymob can be used for payment routing",
    descriptionAr: "التحكم في إتاحة باي موب لتوجيه المدفوعات",
    category: "PAYMENT",
    domain: "payment",
    valueType: "BOOLEAN",
    value: true,
    defaultValue: true,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.payment",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-paymob-enabled",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "toggle" },
  },
  {
    key: "payment.provider.paymob.maintenanceMode",
    label: "Paymob Maintenance Mode",
    labelAr: "وضع الصيانة لباي موب",
    description: "Temporarily disables Paymob checkout availability",
    descriptionAr: "إيقاف مؤقت لاستقبال عمليات جديدة عبر باي موب",
    category: "PAYMENT",
    domain: "payment",
    valueType: "BOOLEAN",
    value: false,
    defaultValue: false,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.payment",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-paymob-maint",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "toggle" },
  },
  {
    key: "payment.provider.paymob.checkoutFlow",
    label: "Paymob Checkout Flow",
    labelAr: "نمط الدفع لباي موب",
    description: "Selects the active Paymob checkout flow",
    descriptionAr: "اختيار نمط الدفع النشط لباي موب",
    category: "PAYMENT",
    domain: "payment",
    valueType: "STRING",
    value: "legacy",
    defaultValue: "legacy",
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.payment",
    enumOptions: ["legacy", "unified", "hosted"],
    jsonSchemaId: null,
    valueId: "val-paymob-flow",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "select" },
  },
  {
    key: "payment.provider.stripe.enabled",
    label: "Stripe Provider Enabled",
    labelAr: "تفعيل بوابة سترايب",
    description: "Controls whether Stripe can be used for payment routing",
    descriptionAr: "التحكم في إتاحة سترايب لتوجيه المدفوعات",
    category: "PAYMENT",
    domain: "payment",
    valueType: "BOOLEAN",
    value: false,
    defaultValue: false,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.payment",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-stripe-enabled",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "toggle" },
  },
];

describe("PlatformPaymentsDomain — Payments & Gateways Domain Editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      isSuccess: false,
    });
    mocks.reset.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      isSuccess: false,
    });
  });

  it("renders Paymob and Stripe providers with supported methods, currencies, and readiness badges", () => {
    render(<PlatformPaymentsDomain settings={mockPaymentSettings} />);

    expect(screen.getByText("paymentsDomain.providers.paymob.name")).toBeTruthy();
    expect(screen.getByText("paymentsDomain.providers.stripe.name")).toBeTruthy();
    expect(screen.getByText("paymentsDomain.readiness.ready")).toBeTruthy();
    expect(screen.getByText("paymentsDomain.readiness.disabled")).toBeTruthy();
  });

  it("masks all sensitive API secrets and credential keys without exposing plaintext", () => {
    render(<PlatformPaymentsDomain settings={mockPaymentSettings} />);

    const maskedSecretElements = screen.getAllByText("paymentsDomain.secrets.masked");
    expect(maskedSecretElements.length).toBeGreaterThanOrEqual(4);
  });

  it("opens the encrypted secret rotation modal when clicking update/rotate secret", async () => {
    const user = userEvent.setup();
    render(<PlatformPaymentsDomain settings={mockPaymentSettings} />);

    const updateSecretBtns = screen.getAllByRole("button", {
      name: /paymentsDomain.secrets.updateSecret/i,
    });
    await user.click(updateSecretBtns[0]);

    expect(screen.getByPlaceholderText("sk_live_••••••••••••••••••••")).toBeTruthy();
  });

  it("opens confirmation dialog and enforces mandatory reason when modifying provider maintenance mode", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    mocks.update.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
    });

    render(<PlatformPaymentsDomain settings={mockPaymentSettings} />);

    const switches = screen.getAllByRole("switch");
    // Switch 1 is paymob maintenance mode
    await user.click(switches[1]);

    // High risk confirmation modal opens
    expect(screen.getByText("paymentsDomain.confirmModal.title")).toBeTruthy();
    expect(screen.getByText("paymentsDomain.confirmModal.warning")).toBeTruthy();

    const saveConfirmBtn = screen.getByRole("button", {
      name: "paymentsDomain.confirmModal.saveBtn",
    });
    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(true);

    // Type mandatory reason
    const reasonInput = screen.getByPlaceholderText(
      "paymentsDomain.confirmModal.reasonPlaceholder"
    );
    await user.type(reasonInput, "Scheduled payment gateway maintenance window");

    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(false);
    await user.click(saveConfirmBtn);

    expect(mutateAsync).toHaveBeenCalledWith({
      key: "payment.provider.paymob.maintenanceMode",
      value: true,
      reason: "Scheduled payment gateway maintenance window",
      expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    });
  });

  it("allows switching checkout flow with immediate two-stage confirmation modal", async () => {
    const user = userEvent.setup();
    render(<PlatformPaymentsDomain settings={mockPaymentSettings} />);

    const unifiedFlowBtn = screen.getByRole("button", { name: "unified" });
    await user.click(unifiedFlowBtn);

    expect(screen.getByText("paymentsDomain.confirmModal.title")).toBeTruthy();
    expect(screen.getAllByText("unified").length).toBeGreaterThanOrEqual(1);
  });
});
