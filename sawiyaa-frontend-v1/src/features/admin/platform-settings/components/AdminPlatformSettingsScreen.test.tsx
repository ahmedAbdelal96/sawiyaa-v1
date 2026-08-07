import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPlatformSettingsScreen from "./AdminPlatformSettingsScreen";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
  update: vi.fn(),
  reset: vi.fn(),
  history: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "ar",
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../hooks/use-platform-settings", () => ({
  usePlatformSettings: mocks.settings,
  useUpdatePlatformSetting: mocks.update,
  useResetPlatformSetting: mocks.reset,
  usePlatformSettingHistory: mocks.history,
}));

const editableSetting = {
  key: "booking.default_duration_minutes",
  label: "Default duration",
  description: "Default booking duration",
  category: "BOOKING",
  domain: "BOOKING",
  valueType: "INTEGER" as const,
  value: 45,
  defaultValue: 30,
  source: "CATALOG_DEFAULT" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "value-1",
  expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
  changedAt: "2026-08-03T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  uiMetadata: { control: "integer" as const },
};

const paymentSetting = {
  ...editableSetting,
  key: "payments.gateway",
  label: "Payment gateway",
  editable: false,
  readOnlyReason: "DEDICATED_PAYMENT_CONTROL" as const,
};

const localeSetting = {
  ...editableSetting,
  key: "platform.defaultLocale",
  label: "Platform Default Locale",
  description: "Fallback locale",
  category: "LOCALE",
  domain: "platform",
  valueType: "STRING" as const,
  value: "ar",
  defaultValue: "en",
  enumOptions: ["ar", "en"],
  uiMetadata: { control: "select" as const },
};

function configureHooks(overrides: Record<string, unknown> = {}) {
  mocks.settings.mockReturnValue({
    data: {
      categories: ["BOOKING"],
      settings: [editableSetting, paymentSetting],
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mocks.refetch,
    ...overrides,
  });
  mocks.update.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  });
  mocks.reset.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  });
  mocks.history.mockReturnValue({ isLoading: false, data: { items: [] } });
}

describe("AdminPlatformSettingsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureHooks();
  });

  it("renders only the safe settings response and exposes payment controls as read-only", () => {
    render(<AdminPlatformSettingsScreen />);

    expect(screen.getByText(editableSetting.key)).toBeTruthy();
    expect(screen.getByText(paymentSetting.key)).toBeTruthy();
    expect(screen.queryByText(/fileUrl|storage|secret/i)).toBeNull();
    expect(
      screen.getByRole("link", { name: "actions.openPaymentControl" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "actions.edit" })).toBeTruthy();
  });

  it("requires a reason and sends the canonical revision when saving", async () => {
    const user = userEvent.setup();
    const mutation = {
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
    };
    mocks.update.mockReturnValue(mutation);
    render(<AdminPlatformSettingsScreen />);

    await user.click(screen.getByRole("button", { name: "actions.edit" }));
    const save = screen.getByRole("button", { name: "actions.save" });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await user.type(
      screen.getByRole("textbox", { name: "editor.reason" }),
      "Adjust booking policy",
    );
    expect((save as HTMLButtonElement).disabled).toBe(false);
    await user.click(save);

    expect(mutation.mutate).toHaveBeenCalledWith(
      {
        key: editableSetting.key,
        value: editableSetting.value,
        reason: "Adjust booking policy",
        expectedUpdatedAt: editableSetting.expectedUpdatedAt,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("offers reload latest after a revision conflict", async () => {
    const user = userEvent.setup();
    mocks.update.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      isSuccess: false,
    });
    mocks.refetch.mockResolvedValue({
      data: { settings: [editableSetting, paymentSetting] },
    });
    render(<AdminPlatformSettingsScreen />);

    await user.click(screen.getByRole("button", { name: "actions.edit" }));
    expect(screen.getByRole("alert").textContent).toContain("states.conflict");
    await user.click(
      screen.getByRole("button", { name: "actions.reloadLatest" }),
    );
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("shows success feedback after a completed update", async () => {
    const user = userEvent.setup();
    mocks.update.mockReturnValue({
      mutate: vi.fn((_payload, options) => options.onSuccess()),
      isPending: false,
      isError: false,
      isSuccess: false,
    });
    render(<AdminPlatformSettingsScreen />);

    await user.click(screen.getByRole("button", { name: "actions.edit" }));
    await user.type(
      screen.getByRole("textbox", { name: "editor.reason" }),
      "Update policy",
    );
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("states.saved"),
    );
  });

  it("renders canonical locale values as a select and submits the selected code", async () => {
    const user = userEvent.setup();
    const mutation = {
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
    };
    mocks.settings.mockReturnValue({
      data: { categories: ["LOCALE"], settings: [localeSetting] },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    mocks.update.mockReturnValue(mutation);
    render(<AdminPlatformSettingsScreen />);

    await user.click(screen.getByRole("button", { name: "actions.edit" }));
    const selects = screen.getAllByRole("combobox");
    const select = selects[selects.length - 1];
    expect((select as HTMLSelectElement).value).toBe("ar");
    expect(
      Array.from((select as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).toEqual(["ar", "en"]);

    await user.selectOptions(select, "en");
    await user.type(
      screen.getByRole("textbox", { name: "editor.reason" }),
      "Set English platform fallback",
    );
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    expect(mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ key: localeSetting.key, value: "en" }),
      expect.anything(),
    );
  });

  it("opens the dedicated SessionReminderScheduleEditor when editing SESSION_REMINDER_OFFSETS_MINUTES", async () => {
    const user = userEvent.setup();
    const sessionReminderSetting = {
      key: "SESSION_REMINDER_OFFSETS_MINUTES",
      label: "مواعيد تذكير الجلسة بالدقائق",
      description: "جدولة التذكيرات بالدقائق",
      category: "NOTIFICATION",
      domain: "sessions",
      valueType: "JSON" as const,
      value: [60, 15, 0],
      defaultValue: [60, 15, 0],
      source: "CATALOG_DEFAULT" as const,
      editable: true,
      permission: "configuration.edit.operational",
      enumOptions: null,
      jsonSchemaId: null,
      valueId: "val-reminders",
      expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
    };

    mocks.settings.mockReturnValue({
      data: { categories: ["NOTIFICATION"], settings: [sessionReminderSetting] },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });

    render(<AdminPlatformSettingsScreen />);

    await user.click(screen.getByRole("button", { name: "actions.edit" }));

    // Must show business title, NOT raw key as primary title
    expect(screen.getByText("مواعيد تذكير الجلسة")).toBeTruthy();
    expect(
      screen.getByText("حدد متى يتلقى المريض والمختص تذكيرات قبل موعد الجلسة وعند بدايتها.")
    ).toBeTruthy();

    // Must show human-readable timeline preview
    expect(screen.getByText("المعاينة الحية للجدول الزمني")).toBeTruthy();
    expect(screen.getAllByText("قبل الجلسة بساعة").length).toBeGreaterThan(0);
  });
});

