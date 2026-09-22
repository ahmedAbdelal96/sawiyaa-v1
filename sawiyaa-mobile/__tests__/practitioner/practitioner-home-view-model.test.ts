import fs from "node:fs";
import path from "node:path";
import {
  countPractitionerSessionsToday,
  getPractitionerHomeAction,
  selectPractitionerHomeNextSession,
  selectPractitionerHomeSessions,
  selectPractitionerHomeUrgentSession,
  shouldShowPractitionerHomeAccountAttention,
  shouldShowPractitionerHomeTodaySummary,
} from "../../src/features/practitioner/home/view-model";
import type { PractitionerSessionListItem } from "../../src/features/practitioner/sessions/types";

function session(
  id: string,
  scheduledStartAt: string,
  overrides: Partial<PractitionerSessionListItem["operational"]> = {},
): PractitionerSessionListItem {
  return {
    id,
    sessionCode: id,
    status: "UPCOMING",
    scheduledStartAt,
    scheduledEndAt: null,
    durationMinutes: 30,
    sessionMode: "VIDEO",
    practitioner: { id: "p1", slug: "practitioner", displayName: "Practitioner" },
    patient: { id: "patient-1", displayName: "Patient" },
    chatAvailability: {
      canRead: true,
      canSend: true,
      readOnly: false,
      reason: "ALLOWED",
    },
    operational: {
      state: "UPCOMING",
      timelineBucket: "PENDING",
      reasonCode: "LIFECYCLE_STATUS",
      join: {
        allowed: false,
        reasonCode: "SESSION_TIME_WINDOW_NOT_OPEN",
        canPrepareRuntime: false,
        opensAt: null,
        closesAt: null,
      },
      actions: {
        canJoin: false,
        canPrepareRuntime: false,
        canCancel: false,
        canPay: false,
        canReview: false,
        canMarkPatientNoShow: false,
        noShowReasonCode: null,
      },
      room: { state: "NOT_PREPARED", closedAt: null },
      resolution: { required: false, finalDecision: null },
      ...overrides,
    },
  };
}

describe("practitioner home view model", () => {
  it("uses publication readiness and does not block on incomplete optional data", () => {
    expect(
      shouldShowPractitionerHomeAccountAttention({
        profileStatus: "APPROVED",
        canPublish: true,
      }),
    ).toBe(false);
    expect(
      shouldShowPractitionerHomeAccountAttention({
        profileStatus: "APPROVED",
        canPublish: false,
      }),
    ).toBe(true);
    expect(
      shouldShowPractitionerHomeAccountAttention({
        profileStatus: "APPROVED",
        canPublish: undefined,
      }),
    ).toBe(false);
  });

  it("has the touched Home and tab copy in Arabic and English", () => {
    const keys = [
      "practitioner.tab.dashboard",
      "practitioner.tab.availability",
      "practitioner.tab.sessions",
      "practitioner.tab.messages",
      "practitioner.tab.more",
      "practitioner.home.greeting",
      "practitioner.home.nextSession",
      "practitioner.home.noUpcomingTitle",
      "practitioner.home.today",
      "practitioner.home.actions.join",
      "practitioner.home.actions.prepare",
      "practitioner.home.actions.review",
      "practitioner.home.actions.view",
    ];
    const at = (value: Record<string, unknown>, key: string) =>
      key.split(".").reduce<unknown>((current, part) => {
        return current && typeof current === "object"
          ? (current as Record<string, unknown>)[part]
          : undefined;
      }, value);

    for (const language of ["ar", "en"]) {
      const locale = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, `../../src/i18n/locales/${language}.json`),
          "utf8",
        ),
      ) as Record<string, unknown>;
      for (const key of keys) {
        expect(at(locale, key)).toEqual(expect.any(String));
        expect(at(locale, key)).not.toBe("");
      }
    }

    const arabicHome = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../../src/i18n/locales/ar.json"),
        "utf8",
      ),
    ) as { practitioner: { home: Record<string, string> } };
    expect(arabicHome.practitioner.home.todaySummary_two).toBe("جلستان اليوم");
  });

  it("keeps only backend upcoming/actionable sessions and sorts them", () => {
    const completed = session("completed", "2026-08-16T07:00:00.000Z", {
      timelineBucket: "COMPLETED",
    });
    const later = session("later", "2026-08-16T12:00:00.000Z");
    const sooner = session("sooner", "2026-08-16T10:00:00.000Z");

    expect(selectPractitionerHomeSessions([later, completed, sooner]).map((item) => item.id)).toEqual([
      "sooner",
      "later",
    ]);
  });

  it("prioritizes a backend-required action over the next scheduled session", () => {
    const next = session("next", "2026-08-16T10:00:00.000Z");
    const required = session("required", "2026-08-16T12:00:00.000Z", {
      resolution: { required: true, finalDecision: null },
      actions: {
        ...next.operational.actions,
        canReview: true,
      },
    });

    expect(selectPractitionerHomeUrgentSession([next, required])?.id).toBe("required");
    expect(selectPractitionerHomeNextSession([next, required])?.id).toBe("required");
    expect(getPractitionerHomeAction(required)).toBe("review");
  });

  it("uses backend join and prepare capabilities without local-time inference", () => {
    const joinable = session("join", "2026-08-16T10:00:00.000Z", {
      join: {
        allowed: true,
        reasonCode: null,
        canPrepareRuntime: false,
        opensAt: null,
        closesAt: null,
      },
    });
    const prepare = session("prepare", "2026-08-16T11:00:00.000Z", {
      actions: { ...joinable.operational.actions, canPrepareRuntime: true },
    });

    expect(getPractitionerHomeAction(joinable)).toBe("join");
    expect(getPractitionerHomeAction(prepare)).toBe("prepare");
  });

  it("counts today's sessions in the practitioner timezone for display only", () => {
    const today = session("today", "2026-08-16T01:00:00.000Z");
    const tomorrow = session("tomorrow", "2026-08-17T01:00:00.000Z");

    expect(
      countPractitionerSessionsToday(
        [today, tomorrow],
        new Date("2026-08-16T04:00:00.000Z"),
        "Asia/Riyadh",
      ),
    ).toBe(1);
  });

  it("omits the Today summary when there are no sessions today or upcoming", () => {
    expect(shouldShowPractitionerHomeTodaySummary(0, 0)).toBe(false);
    expect(shouldShowPractitionerHomeTodaySummary(2, 0)).toBe(true);
    expect(shouldShowPractitionerHomeTodaySummary(0, 2)).toBe(true);
  });
});
