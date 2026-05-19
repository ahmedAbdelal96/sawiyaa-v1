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
});

