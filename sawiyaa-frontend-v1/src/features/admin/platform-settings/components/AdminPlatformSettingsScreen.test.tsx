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
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key} (${params.count})`;
    return key;
  },
  useLocale: () => "ar",
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => "/admin/settings",
  Link: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../hooks/use-platform-settings", () => ({
  usePlatformSettings: mocks.settings,
  useUpdatePlatformSetting: mocks.update,
  useResetPlatformSetting: mocks.reset,
  usePlatformSettingHistory: mocks.history,
}));

vi.mock("./AdminPlatformCommissionCard", () => ({
  default: () => <div data-testid="commission-card">Commission Card Mock</div>,
}));

const editableBookingSetting = {
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

const notificationSetting = {
  key: "SESSION_LATE_REMINDER_ENABLED",
  label: "Late Session Reminder Enabled",
  labelAr: "تفعيل تذكير التأخر عن الجلسة",
  description: "Enable the reminder sent after the session starts",
  descriptionAr: "تفعيل التذكير بعد بداية الجلسة",
  category: "NOTIFICATION",
  domain: "notifications",
  valueType: "BOOLEAN" as const,
  value: true,
  defaultValue: true,
  source: "OVERRIDE" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "value-2",
  expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
  changedAt: "2026-08-03T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  uiMetadata: { control: "toggle" as const },
};

const paymentSetting = {
  key: "payment.provider.paymob.enabled",
  label: "Paymob Provider Enabled",
  labelAr: "تفعيل بوابة باي موب",
  description: "Controls whether Paymob can be used",
  descriptionAr: "التحكم في إتاحة بوابة باي موب",
  category: "PAYMENT",
  domain: "payment",
  valueType: "BOOLEAN" as const,
  value: true,
  defaultValue: true,
  source: "CATALOG_DEFAULT" as const,
  editable: false,
  readOnlyReason: "DEDICATED_PAYMENT_CONTROL" as const,
  permission: "configuration.edit.financial",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "value-3",
  expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
  changedAt: "2026-08-03T10:00:00.000Z",
  effect: "DEDICATED_CONTROL" as const,
  uiMetadata: { control: "toggle" as const },
};

const storageSetting = {
  key: "file.uploads.chat.enabled",
  label: "Chat files enabled",
  labelAr: "تفعيل مرفقات المحادثات",
  description: "Allow chat attachments",
  descriptionAr: "السماح بإرسال ملفات في المحادثة",
  category: "SYSTEM",
  domain: "file-uploads",
  valueType: "BOOLEAN" as const,
  value: true,
  defaultValue: true,
  source: "CATALOG_DEFAULT" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "value-4",
  expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
  changedAt: "2026-08-03T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  uiMetadata: { control: "toggle" as const },
};

const generalSetting = {
  key: "platform.defaultLocale",
  label: "Platform Default Locale",
  labelAr: "اللغة الافتراضية للمنصة",
  description: "Fallback locale",
  descriptionAr: "اللغة المعتمدة للمنصة",
  category: "LOCALE",
  domain: "platform",
  valueType: "STRING" as const,
  value: "ar",
  defaultValue: "en",
  source: "CATALOG_DEFAULT" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: ["ar", "en"],
  jsonSchemaId: null,
  valueId: "value-5",
  expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
  changedAt: "2026-08-03T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  uiMetadata: { control: "select" as const },
};

function configureHooks(overrides: Record<string, unknown> = {}) {
  mocks.settings.mockReturnValue({
    data: {
      categories: ["SESSION", "NOTIFICATION", "PAYMENT", "SYSTEM", "LOCALE"],
      settings: [
        editableBookingSetting,
        notificationSetting,
        paymentSetting,
        storageSetting,
        generalSetting,
      ],
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

describe("AdminPlatformSettingsScreen — Platform Settings Shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams();
    configureHooks();
  });

  it("renders the Executive Control Center header, KPI summary stats, and breadcrumb", () => {
    render(<AdminPlatformSettingsScreen />);

    expect(screen.getByText("page.title")).toBeTruthy();
    expect(screen.getByText("page.breadcrumb")).toBeTruthy();
    expect(screen.getByText("stats.total")).toBeTruthy();
    expect(screen.getByText("stats.overridden")).toBeTruthy();
    expect(screen.getByText("stats.readonly")).toBeTruthy();
    expect(screen.getByText("stats.categories")).toBeTruthy();
  });

  it("renders all 6 Business Domain cards in the Domain Hub on landing view", () => {
    render(<AdminPlatformSettingsScreen />);

    expect(screen.getAllByText("الجلسات والحجوزات").length).toBeGreaterThan(0);
    expect(screen.getAllByText("الإشعارات ومواعيد التذكير").length).toBeGreaterThan(0);
    expect(screen.getAllByText("توزيع الإيرادات والعمولات").length).toBeGreaterThan(0);
    expect(screen.getAllByText("بوابات الدفع والفوترة").length).toBeGreaterThan(0);
    expect(screen.getAllByText("سياسات الملفات والمرفقات").length).toBeGreaterThan(0);
    expect(screen.getAllByText("الهوية والنظام العام").length).toBeGreaterThan(0);
  });

  it("navigates into a domain and updates URL when a domain tab or card is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminPlatformSettingsScreen />);

    // Click on the first element containing "الجلسات والحجوزات" (tab button)
    const elements = screen.getAllByText("الجلسات والحجوزات");
    await user.click(elements[0]);

    expect(mocks.push).toHaveBeenCalledWith("/admin/settings?domain=sessions");
  });

  it("filters settings in real-time when typing in the search box", async () => {
    const user = userEvent.setup();
    render(<AdminPlatformSettingsScreen />);

    const searchInput = screen.getByLabelText("filters.search");
    await user.type(searchInput, "باي موب");

    // Paymob setting should remain visible
    expect(screen.getByText("تفعيل بوابة باي موب")).toBeTruthy();
    // Others should not be matched
    expect(screen.queryByText("اللغة الافتراضية للمنصة")).toBeNull();
  });

  it("renders a dedicated focused banner and back button when active domain is set", () => {
    mocks.searchParams = new URLSearchParams("domain=sessions");
    render(<AdminPlatformSettingsScreen />);

    expect(screen.getByText("domains.backToAll")).toBeTruthy();
    expect(screen.getByText(editableBookingSetting.key)).toBeTruthy();
  });

  it("renders Commission Card when in revenue_share domain", () => {
    mocks.searchParams = new URLSearchParams("domain=revenue_share");
    render(<AdminPlatformSettingsScreen />);

    expect(screen.getByTestId("commission-card")).toBeTruthy();
  });

  it("requires a mandatory reason before saving an updated setting", async () => {
    const user = userEvent.setup();
    const mutation = {
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
    };
    mocks.update.mockReturnValue(mutation);
    render(<AdminPlatformSettingsScreen />);

    // Click edit on the editable booking setting
    const editButtons = screen.getAllByRole("button", { name: /actions.edit/i });
    await user.click(editButtons[0]);

    const saveButton = screen.getByRole("button", { name: "actions.save" });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    const reasonInput = screen.getByPlaceholderText("editor.reasonPlaceholder");
    await user.type(reasonInput, "Adjust SLA window for operational peak hours");

    expect((saveButton as HTMLButtonElement).disabled).toBe(false);
    await user.click(saveButton);

    expect(mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        key: editableBookingSetting.key,
        reason: "Adjust SLA window for operational peak hours",
      }),
      expect.anything()
    );
  });
});
