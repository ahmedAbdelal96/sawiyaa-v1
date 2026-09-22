import { resolvePatientHomePrimaryState } from "../src/features/patient/journey/home-view-model";
import type { MobileNextSession } from "../src/features/sessions/next-session";

const session = (overrides: Partial<MobileNextSession["operational"]> = {}): MobileNextSession => ({
  sessionId: "session-1",
  role: "PATIENT",
  counterpart: { displayName: "Mona Hassan", avatarUrl: null },
  startsAt: "2026-08-16T16:00:00.000Z",
  scheduledEndAt: "2026-08-16T16:30:00.000Z",
  durationMinutes: 30,
  displayTimezone: "Africa/Cairo",
  status: "UPCOMING",
  detailsRoute: "/(patient)/sessions/session-1",
  joinRoute: "/(patient)/sessions/session-1",
  operational: {
    state: "UPCOMING",
    reasonCode: "LIFECYCLE_STATUS",
    join: { allowed: false, reasonCode: "SESSION_TIME_WINDOW_NOT_OPEN", canPrepareRuntime: false, opensAt: null, closesAt: null },
    actions: { canJoin: false, canPrepareRuntime: false, canCancel: true, canPay: false, canReview: false, canMarkPatientNoShow: false, noShowReasonCode: null },
    room: { state: "NOT_APPLICABLE", closedAt: null },
    resolution: { required: false, finalDecision: null },
    ...overrides,
  },
});

describe("Patient Home primary state", () => {
  test("prioritizes payment when the backend allows payment", () => {
    expect(resolvePatientHomePrimaryState(session({ actions: { ...session().operational.actions, canPay: true } }))).toBe("PAYMENT_REQUIRED");
  });

  test("prioritizes joinable/current sessions", () => {
    expect(resolvePatientHomePrimaryState(session({ join: { ...session().operational.join, allowed: true } }))).toBe("JOINABLE");
  });

  test("keeps later sessions as upcoming", () => {
    expect(resolvePatientHomePrimaryState(session())).toBe("UPCOMING");
  });

  test("uses discovery when no next session exists", () => {
    expect(resolvePatientHomePrimaryState(null)).toBe("DISCOVERY");
  });
});
