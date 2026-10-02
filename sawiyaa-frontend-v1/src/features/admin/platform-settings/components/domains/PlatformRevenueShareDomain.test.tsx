import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformRevenueShareDomain from "./PlatformRevenueShareDomain";
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

vi.mock("../AdminPlatformCommissionCard", () => ({
  default: () => <div data-testid="unified-commission-card">Unified Commission Card Mock</div>,
}));

const sameCountrySetting: PlatformSetting = {
  key: "finance.practitionerSharePercent.sameCountry",
  label: "Practitioner Share Percent (Same Country)",
  labelAr: "نسبة حصة الممارس للجلسات المحلية",
  description: "Practitioner revenue share percentage for same-country patient sessions.",
  descriptionAr: "النسبة المخصصة للممارس عندما يكون المريض والممارس داخل نفس الدولة.",
  category: "PAYOUT",
  domain: "finance",
  valueType: "NUMBER",
  value: 70,
  defaultValue: 70,
  source: "CATALOG_DEFAULT",
  minimum: 0,
  maximum: 100,
  editable: true,
  permission: "configuration.edit.financial",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "val-same-country",
  expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
  changedAt: "2026-08-20T10:00:00.000Z",
  effect: "NEW_SESSIONS_ONLY",
  status: "ACTIVE",
  deprecatedReplacementKey: null,
  deprecationReason: null,
  uiMetadata: { control: "percentage" },
};

const crossCountrySetting: PlatformSetting = {
  key: "finance.practitionerSharePercent.crossCountry",
  label: "Practitioner Share Percent (Cross Country)",
  labelAr: "نسبة حصة الممارس للجلسات عابرة للحدود",
  description: "Practitioner revenue share percentage for cross-country patient sessions.",
  descriptionAr: "النسبة المخصصة للممارس عندما يكون المريض والممارس في دولتين مختلفتين.",
  category: "PAYOUT",
  domain: "finance",
  valueType: "NUMBER",
  value: 50,
  defaultValue: 50,
  source: "CATALOG_DEFAULT",
  minimum: 0,
  maximum: 100,
  editable: true,
  permission: "configuration.edit.financial",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "val-cross-country",
  expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
  changedAt: "2026-08-20T10:00:00.000Z",
  effect: "NEW_SESSIONS_ONLY",
  status: "ACTIVE",
  deprecatedReplacementKey: null,
  deprecationReason: null,
  uiMetadata: { control: "percentage" },
};

const mockFinanceSettings = [sameCountrySetting, crossCountrySetting];

describe("PlatformRevenueShareDomain — Revenue Share & Commission Editor", () => {
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

  it("renders Local Revenue Share with default 30% Platform / 70% Practitioner and live calculation simulation", () => {
    render(<PlatformRevenueShareDomain settings={mockFinanceSettings} />);

    expect(screen.getByText("revenueShareDomain.sections.local.title")).toBeTruthy();
    expect(screen.getAllByText("30.0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("70.0%").length).toBeGreaterThan(0);

    // 1000 EGP simulation cuts
    expect(screen.getByText("300 EGP")).toBeTruthy();
    expect(screen.getByText("700 EGP")).toBeTruthy();
  });

  it("renders Cross-Border Revenue Share with default 50% Platform / 50% Practitioner and live simulation", () => {
    render(<PlatformRevenueShareDomain settings={mockFinanceSettings} />);

    expect(screen.getByText("revenueShareDomain.sections.crossBorder.title")).toBeTruthy();
    expect(screen.getAllByText("50.0%").length).toBeGreaterThan(0);

    // 1000 EGP simulation cuts for cross-border
    expect(screen.getAllByText("500 EGP").length).toBe(2);
  });

  it("renders the Unified Authoritative Commission Rule section", () => {
    render(<PlatformRevenueShareDomain settings={mockFinanceSettings} />);

    expect(screen.getByTestId("unified-commission-card")).toBeTruthy();
  });

  it("updates live simulation and enables Save CTA when adjusting platform share stepper", async () => {
    const user = userEvent.setup();
    render(<PlatformRevenueShareDomain settings={mockFinanceSettings} />);

    // Click Increase on the first platform share stepper (Local 30% -> 31%)
    const increaseBtn = screen.getByRole("button", { name: "Increase Local Platform Share" });
    await user.click(increaseBtn);

    // Platform becomes 31%, Practitioner becomes 69%
    expect(screen.getByText("31")).toBeTruthy();
    expect(screen.getByText("69.0%")).toBeTruthy();
    expect(screen.getByText("310 EGP")).toBeTruthy();
    expect(screen.getByText("690 EGP")).toBeTruthy();

    // Save CTA appears
    expect(screen.getByRole("button", { name: "actions.save" })).toBeTruthy();
  });

  it("opens high financial risk confirmation dialog and enforces mandatory audit reason before saving", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    mocks.update.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
    });

    render(<PlatformRevenueShareDomain settings={mockFinanceSettings} />);

    // Increase Local Platform share to 35% (click 5 times)
    const increaseBtn = screen.getByRole("button", { name: "Increase Local Platform Share" });
    for (let i = 0; i < 5; i++) {
      await user.click(increaseBtn);
    }

    // Click Save
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    // Confirmation Modal opens
    expect(screen.getByText("revenueShareDomain.confirmModal.title")).toBeTruthy();
    expect(screen.getByText("revenueShareDomain.confirmModal.warning")).toBeTruthy();

    const saveConfirmBtn = screen.getByRole("button", {
      name: "revenueShareDomain.confirmModal.saveBtn",
    });
    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(true);

    // Type mandatory financial audit reason
    const reasonInput = screen.getByPlaceholderText(
      "revenueShareDomain.confirmModal.reasonPlaceholder"
    );
    await user.type(reasonInput, "Adjust platform fee structure per Q3 board approval");

    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(false);
    await user.click(saveConfirmBtn);

    // Submits practitioner share as 65% (100 - 35) to canonical backend key
    expect(mutateAsync).toHaveBeenCalledWith({
      key: "finance.practitionerSharePercent.sameCountry",
      value: 65,
      reason: "Adjust platform fee structure per Q3 board approval",
      expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    });
  });
});
