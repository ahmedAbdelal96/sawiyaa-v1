import {
  getPatientSessionPrimaryAction,
  getPatientSessionStatusKey,
  splitPatientSessions,
} from "../src/features/patient/sessions/view-model";
import type { SessionListItem, SessionStatus } from "../src/features/patient/sessions/types";

function session(
  id: string,
  state: SessionStatus,
  options: {
    timelineBucket?: SessionListItem["operational"]["timelineBucket"];
    canJoin?: boolean;
    canPay?: boolean;
    canReview?: boolean;
    start?: string;
  } = {},
): SessionListItem {
  const canJoin = options.canJoin ?? false;
  const canPay = options.canPay ?? false;
  const canReview = options.canReview ?? false;

  return {
    id,
    sessionCode: `S-${id}`,
    status: state,
    scheduledStartAt: options.start ?? "2026-08-20T10:00:00.000Z",
    scheduledEndAt: "2026-08-20T10:30:00.000Z",
    durationMinutes: 30,
    sessionMode: "VIDEO",
    practitioner: { id: "p-1", slug: "doctor", displayName: "Dr. Test" },
    patient: null,
    actions: {
      canCancel: false,
      canPrepareRoom: false,
      canJoin,
      canPay,
      canReview,
    },
    chatAvailability: {
      canRead: false,
      canSend: false,
      readOnly: false,
      reason: "NOT_PARTICIPANT",
    },
    operational: {
      state,
      timelineBucket: options.timelineBucket ?? "PENDING",
      reasonCode: "LIFECYCLE_STATUS",
      join: {
        allowed: canJoin,
        reasonCode: null,
        canPrepareRuntime: false,
        opensAt: null,
        closesAt: null,
      },
      actions: {
        canJoin,
        canPrepareRuntime: false,
        canCancel: false,
        canPay,
        canReview,
        canMarkPatientNoShow: false,
        noShowReasonCode: null,
      },
      room: { state: "NOT_APPLICABLE", closedAt: null },
      resolution: { required: false, finalDecision: null },
    },
  };
}

describe("patient sessions view model", () => {
  it("keeps actionable sessions in Upcoming and orders them by backend action priority", () => {
    const result = splitPatientSessions([
      session("future", "UPCOMING", { start: "2026-08-21T10:00:00.000Z" }),
      session("payment", "PENDING_PAYMENT", { canPay: true }),
      session("join", "READY_TO_JOIN", { canJoin: true }),
      session("review", "AWAITING_ADMIN_RESOLUTION", { canReview: true }),
      session("completed", "COMPLETED", {
        timelineBucket: "COMPLETED",
        start: "2026-08-19T10:00:00.000Z",
      }),
    ]);

    expect(result.upcoming.map(({ id }) => id)).toEqual([
      "review",
      "join",
      "payment",
      "future",
    ]);
    expect(result.history.map(({ id }) => id)).toEqual(["completed"]);
  });

  it("maps each card to exactly one strongest action", () => {
    expect(getPatientSessionPrimaryAction(session("join", "READY_TO_JOIN", { canJoin: true }))).toBe("join");
    expect(getPatientSessionPrimaryAction(session("pay", "PENDING_PAYMENT", { canPay: true }))).toBe("pay");
    expect(getPatientSessionPrimaryAction(session("view", "UPCOMING"))).toBe("view");
  });

  it("maps backend states to human-facing status keys", () => {
    expect(getPatientSessionStatusKey("PENDING_PAYMENT")).toBe("paymentRequired");
    expect(getPatientSessionStatusKey("READY_TO_JOIN")).toBe("readyToJoin");
    expect(getPatientSessionStatusKey("PRACTITIONER_NO_SHOW")).toBe("noShow");
    expect(getPatientSessionStatusKey("EXPIRED")).toBe("unavailable");
  });
});
