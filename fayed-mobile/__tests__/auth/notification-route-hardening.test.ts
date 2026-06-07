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

  it("routes message notifications to the unified messages tabs", () => {
    expect(
      resolvePatientNotificationRoute("/patient/support/123", "messages.support-message-received"),
    ).toBe("/(patient)/messages?tab=support");
    expect(
      resolvePatientNotificationRoute("/patient/care-chat/123", "messages.follow-up-message-received"),
    ).toBe("/(patient)/messages?tab=followup");
    expect(
      resolvePatientNotificationRoute("/patient/messages/123", "messages.session-message-received"),
    ).toBe("/(patient)/messages?tab=sessions");
  });
});
