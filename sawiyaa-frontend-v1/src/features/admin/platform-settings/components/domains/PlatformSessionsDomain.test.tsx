import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformSessionsDomain from "./PlatformSessionsDomain";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  reset: vi.fn(),
  history: vi.fn(),
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

const instantRequestTtlSetting = {
  key: "INSTANT_BOOKING_REQUEST_TTL_MINUTES",
  label: "Instant request response window",
  labelAr: "مدة انتظار رد المختص على طلب الجلسة الفورية",
  description: "Minutes a practitioner has to accept or reject",
  descriptionAr: "عدد الدقائق المتاحة للمختص لقبول أو رفض طلب جلسة فورية",
  category: "SESSION",
  domain: "instant-booking",
  valueType: "INTEGER" as const,
  value: 2,
  defaultValue: 2,
  source: "CATALOG_DEFAULT" as const,
  minimum: 1,
  maximum: 30,
  unit: "minutes" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "val-instant-ttl",
  expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
  changedAt: "2026-08-20T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  uiMetadata: { control: "integer" as const },
};

const instantPaymentWindowSetting = {
  key: "INSTANT_BOOKING_PAYMENT_WINDOW_MINUTES",
  label: "Instant payment completion window",
  labelAr: "مهلة إتمام الدفع بعد قبول طلب الجلسة الفورية",
  description: "Minutes a patient has to complete payment",
  descriptionAr: "عدد الدقائق المتاحة للمريض لإتمام الدفع",
  category: "SESSION",
  domain: "instant-booking",
  valueType: "INTEGER" as const,
  value: 5,
  defaultValue: 5,
  source: "CATALOG_DEFAULT" as const,
  minimum: 1,
  maximum: 30,
  unit: "minutes" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "val-instant-pay",
  expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
  changedAt: "2026-08-20T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  uiMetadata: { control: "integer" as const },
};

const earlyJoinSetting = {
  key: "SESSION_JOIN_EARLY_MINUTES",
  label: "Session Join Early Minutes",
  labelAr: "دقائق فتح الدخول قبل الجلسة",
  description: "Configured early join window before start",
  descriptionAr: "نافذة الدخول القابلة للتهيئة قبل البداية",
  category: "SESSION",
  domain: "sessions",
  valueType: "INTEGER" as const,
  value: 15,
  defaultValue: 15,
  source: "CATALOG_DEFAULT" as const,
  minimum: 0,
  maximum: 120,
  unit: "minutes" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "val-early-join",
  expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
  changedAt: "2026-08-20T10:00:00.000Z",
  effect: "NEW_SESSIONS_ONLY" as const,
  uiMetadata: { control: "integer" as const },
};

const afterEndGraceSetting = {
  key: "SESSION_JOIN_AFTER_END_GRACE_MINUTES",
  label: "Session Join After-End Grace Minutes",
  labelAr: "دقائق السماح بالدخول بعد نهاية الجلسة",
  description: "Configured post-end reconnect grace window",
  descriptionAr: "نافذة السماح القابلة للتهيئة لإعادة الدخول",
  category: "SESSION",
  domain: "sessions",
  valueType: "INTEGER" as const,
  value: 10,
  defaultValue: 10,
  source: "OVERRIDE" as const,
  minimum: 0,
  maximum: 120,
  unit: "minutes" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "val-after-end",
  expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
  changedAt: "2026-08-20T10:00:00.000Z",
  effect: "NEW_SESSIONS_ONLY" as const,
  uiMetadata: { control: "integer" as const },
};

const packagesEnabledSetting = {
  key: "packages.enabled",
  label: "Package Plans Enabled",
  labelAr: "تفعيل باقات الجلسات",
  description: "Controls whether package plans are visible",
  descriptionAr: "التحكم في ظهور باقات الجلسات",
  category: "BOOKING",
  domain: "packages",
  valueType: "BOOLEAN" as const,
  value: true,
  defaultValue: true,
  source: "CATALOG_DEFAULT" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "val-packages-en",
  expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
  changedAt: "2026-08-20T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  uiMetadata: { control: "toggle" as const },
};

const packagesPurchaseSetting = {
  key: "packages.purchaseEnabled",
  label: "Package Purchases Enabled",
  labelAr: "السماح بشراء باقات الجلسات",
  description: "Controls whether package purchases are enabled",
  descriptionAr: "التحكم في إمكانية شراء الباقات",
  category: "BOOKING",
  domain: "packages",
  valueType: "BOOLEAN" as const,
  value: true,
  defaultValue: true,
  source: "CATALOG_DEFAULT" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "val-packages-pur",
  expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
  changedAt: "2026-08-20T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  uiMetadata: { control: "toggle" as const },
};

import type { PlatformSetting } from "../../types/platform-settings.types";

const mockSessionSettings: PlatformSetting[] = [
  instantRequestTtlSetting,
  instantPaymentWindowSetting,
  earlyJoinSetting,
  afterEndGraceSetting,
  packagesEnabledSetting,
  packagesPurchaseSetting,
] as unknown as PlatformSetting[];

describe("PlatformSessionsDomain — Sessions & Booking Domain Editor", () => {
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

  it("renders all 3 structured sections: Instant Booking SLAs, Room Access Buffers, and Package Plans", () => {
    render(<PlatformSessionsDomain settings={mockSessionSettings} />);

    // Section 1: Instant Booking
    expect(screen.getByText("sessionsDomain.sections.instantBooking.title")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.items.instantRequestTtl.title")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.items.instantPaymentWindow.title")).toBeTruthy();

    // Section 2: Room Access & Buffers
    expect(screen.getByText("sessionsDomain.sections.roomAccess.title")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.items.earlyJoin.title")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.items.afterEndGrace.title")).toBeTruthy();

    // Section 3: Package Plans
    expect(screen.getByText("sessionsDomain.sections.packages.title")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.items.packagesEnabled.title")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.items.packagesPurchaseEnabled.title")).toBeTruthy();
  });

  it("displays existing values and allows increasing stepper value with immediate save CTA", async () => {
    const user = userEvent.setup();
    render(<PlatformSessionsDomain settings={mockSessionSettings} />);

    // Instant request TTL starts at 2
    expect(screen.getByText("2")).toBeTruthy();

    // Click Increase on the first stepper
    const increaseButtons = screen.getAllByRole("button", { name: "Increase" });
    await user.click(increaseButtons[0]);

    // Value should become 3 and Save button appears
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "actions.save" })).toBeTruthy();
  });

  it("opens two-stage confirmation modal with before/after diff and high-risk warning", async () => {
    const user = userEvent.setup();
    render(<PlatformSessionsDomain settings={mockSessionSettings} />);

    // Increase Instant Request TTL from 2 to 3
    const increaseButtons = screen.getAllByRole("button", { name: "Increase" });
    await user.click(increaseButtons[0]);

    // Click Save
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    // Confirmation modal should appear
    expect(screen.getByText("sessionsDomain.confirmModal.title")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.confirmModal.previousValue")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.confirmModal.newValue")).toBeTruthy();
    expect(screen.getByText("sessionsDomain.confirmModal.highRiskWarning")).toBeTruthy();
  });

  it("enforces mandatory reason and submits updated value via mutation", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    mocks.update.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
    });

    render(<PlatformSessionsDomain settings={mockSessionSettings} />);

    // Increase Early Join from 15 to 20
    const increaseButtons = screen.getAllByRole("button", { name: "Increase" });
    await user.click(increaseButtons[2]); // Early join is the 3rd stepper

    // Click Save
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    const saveConfirmBtn = screen.getByRole("button", { name: "sessionsDomain.confirmModal.saveBtn" });
    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(true);

    // Type mandatory reason
    const reasonInput = screen.getByPlaceholderText("sessionsDomain.confirmModal.reasonPlaceholder");
    await user.type(reasonInput, "Extend check-in window for group therapy preparation");

    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(false);
    await user.click(saveConfirmBtn);

    expect(mutateAsync).toHaveBeenCalledWith({
      key: "SESSION_JOIN_EARLY_MINUTES",
      value: 20,
      reason: "Extend check-in window for group therapy preparation",
      expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    });
  });

  it("allows toggling package plans and saving with reason", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    mocks.update.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
    });

    render(<PlatformSessionsDomain settings={mockSessionSettings} />);

    // Toggle packages enabled switch
    const toggleButtons = screen.getAllByRole("button", { name: /editor.booleanEnabled/i });
    if (toggleButtons.length > 0) {
      await user.click(toggleButtons[0]);

      // Save button appears
      const saveBtn = screen.getByRole("button", { name: "actions.save" });
      await user.click(saveBtn);

      const reasonInput = screen.getByPlaceholderText("sessionsDomain.confirmModal.reasonPlaceholder");
      await user.type(reasonInput, "Temporarily disable packages during catalogue review");

      await user.click(screen.getByRole("button", { name: "sessionsDomain.confirmModal.saveBtn" }));

      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "packages.enabled",
          value: false,
          reason: "Temporarily disable packages during catalogue review",
        })
      );
    }
  });
});
