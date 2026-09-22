import { resolvePatientNotificationRoute } from "../../src/features/patient/notifications/routes";

describe("patient notification route hardening", () => {
  it("rejects absolute URLs", () => {
    expect(
      resolvePatientNotificationRoute("https://evil.example/patient/sessions/123"),
    ).toBeNull();
  });

  it("rejects unsafe protocols", () => {
    expect(
      resolvePatientNotificationRoute("javascript:alert(1)"),
    ).toBeNull();
    expect(resolvePatientNotificationRoute("data:text/html,hi")).toBeNull();
    expect(resolvePatientNotificationRoute("file:///etc/passwd")).toBeNull();
  });

  it("accepts valid patient routes only", () => {
    expect(resolvePatientNotificationRoute("/patient/sessions")).toBe(
      "/(patient)/sessions",
    );
    expect(resolvePatientNotificationRoute("/patient/sessions/abc")).toBe(
      "/(patient)/sessions/abc",
    );
    expect(resolvePatientNotificationRoute("/patient/support")).toBe(
      "/(patient)/support",
    );
  });

  it("routes message notifications only to safe canonical threads", () => {
    expect(
      resolvePatientNotificationRoute("/patient/support/123", "messages.support-message-received"),
    ).toBeNull();
    expect(
      resolvePatientNotificationRoute("/", "messages.follow-up-message-received", {
        primaryAction: { kind: "messages", id: "123" },
      }),
    ).toBe("/(patient)/messages/123");
    expect(
      resolvePatientNotificationRoute("/patient/messages/123", "messages.session-message-received"),
    ).toBe("/(patient)/messages/123");
  });

  it("preserves the accepted session payment route", () => {
    expect(resolvePatientNotificationRoute("/patient/sessions/session-1/pay")).toBe(
      "/(patient)/sessions/session-1/pay",
    );
    expect(resolvePatientNotificationRoute("/patient/payments/transactions")).toBe(
      "/(patient)/payments/transactions",
    );
  });
});
