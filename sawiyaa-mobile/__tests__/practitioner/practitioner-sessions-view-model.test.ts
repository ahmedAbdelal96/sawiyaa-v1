import {
  getPractitionerSessionAction,
  getPractitionerSessionStatusKey,
  isPractitionerSessionHistory,
  sortPractitionerSessions,
  splitPractitionerSessions,
} from "../../src/features/practitioner/sessions/view-model";
import type { PractitionerSessionListItem } from "../../src/features/practitioner/sessions/types";

function session(
  id: string,
  state: PractitionerSessionListItem["operational"]["state"],
  start: string,
  overrides: Partial<PractitionerSessionListItem["operational"]> = {},
): PractitionerSessionListItem {
  return {
    id,
    sessionCode: id,
    status: state,
    scheduledStartAt: start,
    scheduledEndAt: null,
    durationMinutes: 30,
    sessionMode: "VIDEO",
    practitioner: { id: "p1", slug: "p1", displayName: "Practitioner" },
    patient: { id: `patient-${id}`, displayName: id },
    chatAvailability: { canRead: true, canSend: true, readOnly: false, reason: "ALLOWED" },
    operational: {
      state,
      timelineBucket: state === "COMPLETED" ? "COMPLETED" : "PENDING",
      reasonCode: "LIFECYCLE_STATUS",
      join: { allowed: false, reasonCode: null, canPrepareRuntime: false, opensAt: null, closesAt: null },
      actions: { canJoin: false, canPrepareRuntime: false, canCancel: false, canPay: false, canReview: false, canMarkPatientNoShow: false, noShowReasonCode: null },
      room: { state: "NOT_PREPARED", closedAt: null },
      resolution: { required: false, finalDecision: null },
      ...overrides,
    },
  };
}

describe("practitioner sessions view model", () => {
  it("uses Upcoming and History without burying required follow-up", () => {
    const future = session("future", "UPCOMING", "2026-08-16T12:00:00.000Z");
    const completed = session("completed", "COMPLETED", "2026-08-15T12:00:00.000Z");
    const required = session("required", "AWAITING_ADMIN_RESOLUTION", "2026-08-14T12:00:00.000Z", {
      timelineBucket: "TERMINAL",
      actions: { ...future.operational.actions, canReview: true },
      resolution: { required: true, finalDecision: null },
    });

    const grouped = splitPractitionerSessions([completed, required, future]);
    expect(grouped.upcoming.map((item) => item.id)).toEqual(["required", "future"]);
    expect(grouped.history.map((item) => item.id)).toEqual(["completed"]);
    expect(isPractitionerSessionHistory(required)).toBe(false);
  });

  it("prioritizes action-required, then joinable, then the next time", () => {
    const next = session("next", "UPCOMING", "2026-08-16T10:00:00.000Z");
    const joinable = session("joinable", "READY_TO_JOIN", "2026-08-16T11:00:00.000Z", {
      join: { allowed: true, reasonCode: null, canPrepareRuntime: false, opensAt: null, closesAt: null },
    });
    const required = session("required", "AWAITING_ADMIN_RESOLUTION", "2026-08-16T12:00:00.000Z", {
      actions: { ...next.operational.actions, canReview: true },
      resolution: { required: true, finalDecision: null },
    });

    expect(sortPractitionerSessions([next, joinable, required], "upcoming").map((item) => item.id)).toEqual([
      "required",
      "joinable",
      "next",
    ]);
  });

  it("maps primary actions and human status keys from backend capabilities", () => {
    const required = session("required", "AWAITING_ADMIN_RESOLUTION", "2026-08-16T10:00:00.000Z", {
      actions: { canJoin: true, canPrepareRuntime: false, canCancel: false, canPay: false, canReview: true, canMarkPatientNoShow: false, noShowReasonCode: null },
      resolution: { required: true, finalDecision: null },
    });
    expect(getPractitionerSessionAction(required)).toBe("review");
    expect(getPractitionerSessionStatusKey(required)).toBe("actionRequired");
    expect(getPractitionerSessionStatusKey(session("cancelled", "CANCELLED", "2026-08-15T10:00:00.000Z"))).toBe("cancelled");
  });
});
