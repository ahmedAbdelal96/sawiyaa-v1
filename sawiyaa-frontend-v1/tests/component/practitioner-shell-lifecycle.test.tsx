import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PractitionerShell from "@/features/practitioners/components/PractitionerShell";

const mocks = vi.hoisted(() => ({
  authMe: {
    data: {
      isPractitionerOtpVerified: true,
      isPractitionerApproved: false,
    },
    isLoading: false,
    isError: false,
  },
  application: {
    data: { application: { status: "DRAFT" } },
    isLoading: false,
  },
  profileEnabled: [] as boolean[],
  layoutProps: [] as Array<{ messagingRole?: string; navigation: unknown }>,
  replace: vi.fn(),
  pathname: "/practitioner/application",
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuthMe: () => mocks.authMe,
}));

vi.mock("@/features/presence/hooks/use-presence", () => ({
  usePractitionerPresenceHeartbeat: vi.fn(),
}));

vi.mock("@/features/practitioners/hooks/use-practitioners", () => ({
  usePractitionerApplicationStatus: () => mocks.application,
  usePractitionerProfile: (enabled: boolean) => {
    mocks.profileEnabled.push(enabled);
    return { data: undefined, isLoading: false };
  },
}));

vi.mock("@/features/practitioners/components/requirements/PractitionerRequirementsBanner", () => ({
  default: () => null,
}));

vi.mock("@/layout/DashboardLayout", () => ({
  default: ({ children, ...props }: any) => {
    mocks.layoutProps.push(props);
    return <div data-testid="practitioner-shell">{children}</div>;
  },
}));

describe("PractitionerShell lifecycle boundary", () => {
  beforeEach(() => {
    mocks.profileEnabled.length = 0;
    mocks.layoutProps.length = 0;
    mocks.replace.mockReset();
    mocks.pathname = "/practitioner/application";
    mocks.authMe.data.isPractitionerApproved = false;
    mocks.application.data.application.status = "DRAFT";
  });

  it("keeps a DRAFT applicant in the application shell without enabling the operational profile query", () => {
    render(
      <PractitionerShell>
        <div>Applicant application content</div>
      </PractitionerShell>,
    );

    expect(screen.getByText("Applicant application content")).toBeInTheDocument();
    expect(mocks.profileEnabled).toEqual([false]);
    expect(mocks.layoutProps.at(-1)?.messagingRole).toBeUndefined();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects a non-approved practitioner away from operational routes", () => {
    mocks.pathname = "/practitioner/dashboard";

    render(
      <PractitionerShell>
        <div>Operational content</div>
      </PractitionerShell>,
    );

    expect(mocks.profileEnabled).toEqual([false]);
    expect(mocks.replace).toHaveBeenCalledWith("/practitioner/application");
  });
});
