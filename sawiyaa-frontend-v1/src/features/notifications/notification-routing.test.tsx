import { describe, expect, it } from "vitest";
import { resolveNotificationClickTarget } from "@/features/notifications/lib/resolve-notification-click-target";

describe("canonical notification routing", () => {
  it("routes a patient session action to the backend canonical href", () => {
    expect(
      resolveNotificationClickTarget({
        item: {
          id: "n-session-patient",
          typeSlug: "sessions.session-reminder-15",
          action: null,
          payload: {},
          context: undefined,
          primaryAction: {
            kind: "session",
            targetType: "SESSION",
            targetId: "session-1",
            href: "/patient/sessions/session-1",
          },
        },
        role: "patient",
      }),
    ).toEqual({ kind: "href", href: "/patient/sessions/session-1" });
  });

  it("routes a practitioner session action to the backend canonical href", () => {
    expect(
      resolveNotificationClickTarget({
        item: {
          id: "n-session-practitioner",
          typeSlug: "sessions.session-confirmed-practitioner",
          action: null,
          payload: {},
          context: undefined,
          primaryAction: {
            kind: "session",
            targetType: "SESSION",
            targetId: "session-2",
            href: "/practitioner/sessions/session-2",
          },
        },
        role: "practitioner",
      }),
    ).toEqual({ kind: "href", href: "/practitioner/sessions/session-2" });
  });

  it("routes an Admin moderation action to the canonical review page", () => {
    expect(
      resolveNotificationClickTarget({
        item: {
          id: "n-report",
          typeSlug: "moderation.report-created",
          action: null,
          payload: {},
          context: undefined,
          primaryAction: {
            kind: "moderation",
            targetType: "MODERATION_REPORT",
            targetId: "report-1",
            href: "/admin/moderation/reports/report-1",
          },
        },
        role: "admin",
      }),
    ).toEqual({
      kind: "href",
      href: "/admin/moderation/reports/report-1",
    });
  });

  it("uses generic Admin diagnostics only when no canonical action exists", () => {
    expect(
      resolveNotificationClickTarget({
        item: {
          id: "n-unknown",
          typeSlug: "future.unknown",
          action: null,
          payload: {},
          context: undefined,
          primaryAction: { kind: "details" },
        },
        role: "admin",
      }),
    ).toEqual({ kind: "href", href: "/admin/notifications/n-unknown" });
  });
});
