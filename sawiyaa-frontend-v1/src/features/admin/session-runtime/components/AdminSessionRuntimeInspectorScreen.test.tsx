import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminSessionRuntimeInspectorScreen from "./AdminSessionRuntimeInspectorScreen";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: unknown;
  }) => (
    <a
      href={
        typeof href === "string" ? href : "/admin/sessions/runtime-inspector"
      }
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/shared/ContentStates", () => ({
  ListStateSkeleton: () => <div data-testid="loading" />,
  StateCard: ({ title, note }: { title: string; note: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{note}</p>
    </div>
  ),
}));

vi.mock("@/lib/time-formatting", () => ({
  resolveEffectiveViewerTimeZone: () => "Africa/Cairo",
  formatEffectiveViewerDateTime: (value: string) =>
    new Date(value).toISOString(),
}));

vi.mock("@/features/users/hooks/use-users", () => ({
  useCurrentUser: () => ({ data: { timezone: "Africa/Cairo" } }),
  useCurrentUserPermissions: () => ({
    data: { permissions: [] },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../hooks/use-admin-session-runtime", () => ({
  useAdminSessionRuntimeInspection: () => ({
    data: { item: sessionItem },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useAdminSessionAttendance: () => ({
    data: attendanceData,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("../hooks/use-admin-session-manual-decisions", () => ({
  useAdminSessionManualDecisions: () => ({ data: { items: [] } }),
}));

vi.mock("./AdminSessionInspectorEvidenceFlagsPanel", () => ({
  default: () => <div />,
}));
vi.mock("./AdminSessionInspectorOverlapCard", () => ({
  default: () => <div />,
}));
vi.mock("./AdminSessionInspectorRawEvidence", () => ({
  default: () => <div />,
}));
vi.mock("./AdminSessionInspectorRoleCard", () => ({ default: () => <div /> }));
vi.mock("./AdminSessionRoomCloseEvidencePanel", () => ({
  default: () => <div />,
}));
vi.mock("./AdminSessionInspectorTimeline", () => ({ default: () => <div /> }));
vi.mock("./AdminSessionManualDecisionHistory", () => ({
  default: () => <div />,
}));
vi.mock("./AdminSessionPackageEntitlementPanel", () => ({
  default: () => <div />,
}));
vi.mock("./AdminSessionManualDecisionPanel", () => ({
  default: () => <div />,
}));

const sessionItem = {
  id: "internal-session-id",
  sessionCode: "S-260802-0001",
  status: "COMPLETED",
  sessionMode: "VIDEO",
  paymentCoverageType: "DIRECT_PAYMENT",
  scheduledStartAt: "2026-08-02T12:00:00.000Z",
  scheduledEndAt: "2026-08-02T13:00:00.000Z",
  provider: "DAILY",
  providerRoomId: "room-ref",
  providerSessionRef: "session-ref",
  canPrepareRuntime: true,
  canJoin: false,
  blockedReason: null,
  packagePurchase: null,
  relatedSupportTickets: [],
  participants: {
    patient: { displayName: "Patient One" },
    practitioner: { displayName: "Practitioner One" },
  },
};

const attendanceData = {
  extendedSummary: null,
  timeline: [],
  evidenceTimeline: [],
  participants: sessionItem.participants,
  videoRoomClose: null,
  relatedSupportTickets: [],
};

describe("AdminSessionRuntimeInspectorScreen decision workflow", () => {
  beforeEach(() => {
    window.history.replaceState(
      null,
      "",
      "/en/admin/sessions/runtime-inspector",
    );
  });

  it("does not render a lookup form when a session is selected", () => {
    render(
      <AdminSessionRuntimeInspectorScreen initialSessionId={sessionItem.id} />,
    );

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByTestId("runtime-summary")).toBeTruthy();
    expect(screen.getByText("S-260802-0001")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "inspector.header.backToSessions" })
        .getAttribute("href"),
    ).toBe("/admin/sessions");
  });

  it("shows a concise return state without a selected session", () => {
    render(<AdminSessionRuntimeInspectorScreen />);

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      screen.getAllByRole("link", { name: "inspector.header.backToSessions" }),
    ).toHaveLength(2);
  });
});
