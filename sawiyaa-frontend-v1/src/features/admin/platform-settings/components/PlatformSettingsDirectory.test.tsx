import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformSettingsDirectory from "./PlatformSettingsDirectory";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
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
}));

const domains = [
  {
    primaryDomain: "sessions" as const,
    title: "Sessions & Booking",
    titleAr: "الجلسات والحجوزات",
    description: "Session timing",
    descriptionAr: "ضوابط الجلسات",
    count: 6,
    ordinaryCount: 6,
    customizedCount: 1,
    attentionCount: 0,
    permissionState: "EDITABLE" as const,
    lastChange: null,
    dedicatedRoute: null,
    status: "READY" as const,
  },
  {
    primaryDomain: "paymentsFinance" as const,
    title: "Payments & Finance",
    titleAr: "المدفوعات والمالية",
    description: "Payment status",
    descriptionAr: "حالة المدفوعات",
    count: 13,
    ordinaryCount: 0,
    customizedCount: 0,
    attentionCount: 0,
    permissionState: "MANAGED_ELSEWHERE" as const,
    lastChange: null,
    dedicatedRoute: "/admin/payments",
    status: "MANAGED_ELSEWHERE" as const,
  },
  {
    primaryDomain: "patientsAccounts" as const,
    title: "Patients & Accounts",
    titleAr: "الحسابات وملفات المستخدمين",
    description: "Account policies",
    descriptionAr: "سياسات الحسابات",
    count: 6,
    ordinaryCount: 6,
    customizedCount: 0,
    attentionCount: 0,
    permissionState: "EDITABLE" as const,
    lastChange: null,
    dedicatedRoute: null,
    status: "READY" as const,
  },
];

const searchableSetting = {
  key: "SESSION_JOIN_EARLY_MINUTES",
  label: "Early join window",
  labelAr: "نافذة الدخول المبكر",
  description: "Room access timing",
  descriptionAr: "توقيت دخول الغرفة",
  primaryDomain: "sessions" as const,
  dedicatedRoute: null,
  capabilities: {
    advancedOnly: false,
  },
};

describe("PlatformSettingsDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settings.mockReturnValue({
      data: { settings: [], domains, advancedSettings: [] },
      isLoading: false,
      isError: false,
    });
  });

  it("renders a directory without rendering the full settings inventory", () => {
    render(<PlatformSettingsDirectory />);

    expect(screen.getByText("الجلسات والحجوزات")).toBeTruthy();
    expect(screen.getByText("متقدم / تقني")).toBeTruthy();
    expect(screen.queryByText(searchableSetting.labelAr)).toBeNull();
  });

  it("links payment status to the dedicated payment control", () => {
    render(<PlatformSettingsDirectory />);

    expect(
      screen.getByRole("link", { name: /المدفوعات والمالية/ }),
    ).toHaveAttribute("href", "/admin/payments");
  });

  it("uses URL-safe route segments for camel-cased domain identities", () => {
    render(<PlatformSettingsDirectory />);

    expect(
      screen.getByRole("link", { name: /الحسابات وملفات المستخدمين/ }),
    ).toHaveAttribute("href", "/admin/platform-settings/patients-accounts");
  });

  it("renders compact search results that link to the backend-owned domain", async () => {
    const user = userEvent.setup();
    mocks.settings.mockReturnValue({
      data: { settings: [searchableSetting], domains, advancedSettings: [] },
      isLoading: false,
      isError: false,
    });

    render(<PlatformSettingsDirectory />);
    await user.type(screen.getByRole("searchbox"), "جلسة");

    expect(screen.getByText(searchableSetting.labelAr)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /نافذة الدخول المبكر/ }),
    ).toHaveAttribute("href", "/admin/platform-settings/sessions");
  });
});
