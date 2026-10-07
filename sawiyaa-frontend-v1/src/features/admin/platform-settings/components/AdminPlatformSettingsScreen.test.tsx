import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPlatformSettingsScreen from "./AdminPlatformSettingsScreen";

const settingsMock = vi.hoisted(() => vi.fn());

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
  usePlatformSettings: settingsMock,
}));

describe("AdminPlatformSettingsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsMock.mockReturnValue({
      data: {
        categories: [],
        settings: [],
        advancedSettings: [],
        domains: [
          {
            domain: "sessions",
            label: "Sessions",
            labelAr: "الجلسات والحجوزات",
            description: "Session settings",
            descriptionAr: "إعدادات الجلسات",
            count: 0,
            ordinaryCount: 0,
            customizedCount: 0,
            attentionCount: 0,
            permissionState: "EDITABLE",
            status: "READY",
          },
          {
            domain: "paymentsFinance",
            label: "Payments & Finance",
            labelAr: "المدفوعات والمالية",
            description: "Payment settings",
            descriptionAr: "إعدادات المدفوعات",
            count: 0,
            ordinaryCount: 0,
            customizedCount: 0,
            attentionCount: 0,
            permissionState: "MANAGED_ELSEWHERE",
            status: "MANAGED_ELSEWHERE",
            dedicatedRoute: "/admin/payments",
          },
        ],
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it("keeps the settings entrypoint as a directory", () => {
    render(<AdminPlatformSettingsScreen />);

    expect(screen.getByText("directory.title")).toBeTruthy();
    expect(screen.getByText("الجلسات والحجوزات")).toBeTruthy();
    expect(screen.queryByText("directory.searchResults")).toBeNull();
  });
});
