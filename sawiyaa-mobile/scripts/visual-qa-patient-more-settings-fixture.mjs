import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const settings = {
  preferences: { locale: "en", timezone: "Africa/Cairo" },
  notificationPreferences: {
    items: [
      { typeSlug: "sessions.session-reminder", channel: "IN_APP", enabled: true },
      { typeSlug: "sessions.session-reminder", channel: "PUSH", enabled: true },
      { typeSlug: "sessions.session-reminder", channel: "EMAIL", enabled: false },
      { typeSlug: "messages.session-message-received", channel: "IN_APP", enabled: true },
      { typeSlug: "payments.payment-success", channel: "EMAIL", enabled: true },
      { typeSlug: "account.security-alert", channel: "PUSH", enabled: true },
    ],
    supportedChannels: ["IN_APP", "PUSH", "EMAIL"],
    isPersisted: true,
    updatedAt: "2026-08-16T09:00:00.000Z",
  },
  ownership: { ownedSurfaces: ["language", "timezone", "notifications"], outOfScopeSurfaces: [] },
};

export function installPatientMoreSettingsFixtureRoutes(page) {
  return page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ userId: patientVisualQaAuth.user.id, roles: ["PATIENT"], sessionId: "visual-qa-patient-session", authMethod: "access", isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] }) });
      return;
    }
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" }) });
      return;
    }
    if (pathname.endsWith("/patients/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(patientProfile) });
      return;
    }
    if (pathname.endsWith("/notifications/me/unread-count")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount: 2 } }) });
      return;
    }
    if (pathname.endsWith("/settings/me/notification-preferences")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: settings.notificationPreferences }) });
      return;
    }
    if (pathname.endsWith("/settings/me/preferences")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: settings.preferences }) });
      return;
    }
    if (pathname.endsWith("/settings/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: settings }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } }) });
  });
}
