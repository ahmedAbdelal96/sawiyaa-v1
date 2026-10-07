import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformSettingsDomainScreen, {
  formatPlatformSettingValue,
} from "./PlatformSettingsDomainScreen";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
  changeSet: vi.fn(),
  history: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.count === undefined ? key : `${key} (${values.count})`,
  useLocale: () => "ar",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../hooks/use-platform-settings", () => ({
  usePlatformSettings: mocks.settings,
  usePlatformSettingsChangeSet: () => mocks.changeSet(),
  useUpdatePlatformSetting: () => ({ mutate: vi.fn(), isPending: false }),
  useResetPlatformSetting: () => ({ mutate: vi.fn(), isPending: false }),
  usePlatformSettingHistory: mocks.history,
}));

const baseSetting = {
  key: "INSTANT_BOOKING_REQUEST_TTL_MINUTES",
  label: "Practitioner waiting time",
  labelAr: "مدة انتظار المختص لطلب الجلسة",
  description: "Minutes available to accept the request",
  descriptionAr: "المدة المتاحة لقبول الطلب",
  category: "SESSION",
  domain: "instant-booking",
  valueType: "INTEGER" as const,
  value: 2,
  defaultValue: 2,
  source: "CATALOG_DEFAULT" as const,
  effectiveSource: "CATALOG_DEFAULT" as const,
  ownership: "BUSINESS" as const,
  primaryDomain: "sessions" as const,
  section: "instantBooking",
  dedicatedRoute: null,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  valueId: "value-1",
  expectedUpdatedAt: "2026-10-06T00:00:00.000Z",
  changedAt: "2026-10-06T00:00:00.000Z",
  effect: "IMMEDIATE" as const,
  status: "ACTIVE" as const,
  deprecatedReplacementKey: null,
  deprecationReason: null,
  uiMetadata: { control: "integer" as const },
  capabilities: {
    canView: true,
    canEdit: true,
    canReset: false,
    canViewHistory: true,
    requiresConfirmation: false,
    requiresReason: true,
    requiresStepUp: false,
    managedByDedicatedControl: false,
    advancedOnly: false,
  },
};

const packageSetting = {
  ...baseSetting,
  key: "packages.enabled",
  label: "Package plans",
  labelAr: "تفعيل باقات الجلسات",
  valueType: "BOOLEAN" as const,
  value: true,
  defaultValue: false,
  source: "OVERRIDE" as const,
  effectiveSource: "DATABASE_OVERRIDE" as const,
  section: "packages",
  valueId: "value-2",
  uiMetadata: { control: "toggle" as const },
  capabilities: { ...baseSetting.capabilities, canReset: true },
};

const highRiskSetting = {
  ...baseSetting,
  capabilities: { ...baseSetting.capabilities, requiresConfirmation: true },
};

function configureHooks() {
  mocks.settings.mockReturnValue({
    data: {
      settings: [baseSetting, packageSetting],
      advancedSettings: [],
      domains: [],
    },
    isLoading: false,
    isError: false,
  });
  mocks.changeSet.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  });
  mocks.history.mockReturnValue({ isLoading: false, data: { items: [] } });
}

describe("PlatformSettingsDomainScreen inline editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureHooks();
  });

  it("renders editable values inline without edit buttons or a routine modal", () => {
    render(<PlatformSettingsDomainScreen domain="sessions" />);

    expect(screen.getByRole("spinbutton")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "تفعيل باقات الجلسات" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "domainPage.edit" }),
    ).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tracks multiple inline edits and shows one save bar", async () => {
    const user = userEvent.setup();
    render(<PlatformSettingsDomainScreen domain="sessions" />);

    const number = screen.getByRole("spinbutton");
    await user.clear(number);
    await user.type(number, "3");
    await user.click(
      screen.getByRole("button", { name: "تفعيل باقات الجلسات" }),
    );

    expect(screen.getByText("saveBar.unsavedChanges (2)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "saveBar.save" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "saveBar.cancel" })).toBeTruthy();
  });

  it("saves routine multi-edits directly from the save bar with one reason", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      changedCount: 2,
      settings: [baseSetting, packageSetting],
      results: [],
    });
    mocks.changeSet.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
    });
    render(<PlatformSettingsDomainScreen domain="sessions" />);

    const number = screen.getByRole("spinbutton");
    await user.clear(number);
    await user.type(number, "3");
    await user.click(
      screen.getByRole("button", { name: "تفعيل باقات الجلسات" }),
    );
    await user.type(screen.getByLabelText("saveBar.reason"), "تعديل روتيني");
    await user.click(screen.getByRole("button", { name: "saveBar.save" }));

    expect(screen.queryByTestId("change-review")).toBeNull();
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "تعديل روتيني" }),
    );
  });

  it("restores the original draft when cancel is pressed", async () => {
    const user = userEvent.setup();
    render(<PlatformSettingsDomainScreen domain="sessions" />);

    const number = screen.getByRole("spinbutton");
    await user.clear(number);
    await user.type(number, "3");
    await user.click(screen.getByRole("button", { name: "saveBar.cancel" }));

    expect(number).toHaveValue(2);
    expect(screen.queryByText(/saveBar.unsavedChanges/)).toBeNull();
  });

  it("opens one compact review surface and sends changed settings with one reason", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      changedCount: 1,
      settings: [baseSetting],
      results: [],
    });
    mocks.changeSet.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
    });
    mocks.settings.mockReturnValue({
      data: {
        settings: [highRiskSetting, packageSetting],
        advancedSettings: [],
        domains: [],
      },
      isLoading: false,
      isError: false,
    });
    render(<PlatformSettingsDomainScreen domain="sessions" />);

    const number = screen.getByRole("spinbutton");
    await user.clear(number);
    await user.type(number, "3");
    await user.click(screen.getByRole("button", { name: "saveBar.save" }));

    expect(screen.getByText("changeReview.title")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    const reason = screen.getByLabelText("changeReview.reason");
    await user.type(reason, "تعديل مهل الجلسات");
    await user.click(
      screen.getByRole("button", { name: "changeReview.confirm" }),
    );

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "sessions",
        reason: "تعديل مهل الجلسات",
        changes: [
          expect.objectContaining({
            key: baseSetting.key,
            value: 3,
            expectedUpdatedAt: baseSetting.expectedUpdatedAt,
          }),
        ],
      }),
    );
  });

  it("keeps reset in the local draft until the change set is saved", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn();
    mocks.changeSet.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
    });
    render(<PlatformSettingsDomainScreen domain="sessions" />);

    await user.click(
      screen.getByRole("button", { name: "تفعيل باقات الجلسات" }),
    );
    await user.click(
      screen.getByRole("button", { name: "inline.resetDefault" }),
    );

    expect(screen.getByRole("button", { name: "saveBar.save" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "تفعيل باقات الجلسات" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

describe("formatPlatformSettingValue", () => {
  it("humanizes byte values, MIME identifiers, and structured objects", () => {
    expect(
      formatPlatformSettingValue(
        {
          ...baseSetting,
          key: "file.uploads.chat.maxImageBytes",
          value: 10485760,
        },
        true,
      ),
    ).toBe("10 MB");
    expect(
      formatPlatformSettingValue(
        { ...baseSetting, value: ["image/jpeg", "application/pdf"] },
        true,
      ),
    ).toBe("JPEG, PDF");
    expect(
      formatPlatformSettingValue(
        { ...baseSetting, value: { CARD: { enabled: true } } },
        true,
      ),
    ).toBe("تفاصيل متقدمة");
  });
});

describe("small-domain presentation", () => {
  it("does not render a redundant local search or state toolbar", () => {
    configureHooks();
    render(<PlatformSettingsDomainScreen domain="sessions" />);

    expect(screen.queryByLabelText("filters.search")).toBeNull();
    expect(screen.queryByLabelText("filters.state")).toBeNull();
    expect(screen.queryByLabelText("inline.more")).toBeNull();
  });
});
