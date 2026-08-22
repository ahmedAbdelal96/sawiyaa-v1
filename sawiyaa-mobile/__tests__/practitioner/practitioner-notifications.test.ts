import fs from "node:fs";
import path from "node:path";
import {
  groupPractitionerNotificationPreferences,
} from "../../src/features/practitioner/notifications/preferences";
import {
  resolvePractitionerNotificationPresentation,
  resolvePractitionerNotificationRoute,
} from "../../src/features/practitioner/notifications/utils";
import type { UserNotificationItem } from "../../src/features/patient/notifications/types";

type JsonValue = Record<string, any>;

const root = path.resolve(__dirname, "../..");
const readLocale = (language: "ar" | "en") =>
  JSON.parse(
    fs.readFileSync(path.join(root, "src/i18n/locales/" + language + ".json"), "utf8"),
  ) as JsonValue;

const at = (value: JsonValue, key: string) =>
  key.split(".").reduce((current, part) => current?.[part], value);

function translator(language: "ar" | "en") {
  const locale = readLocale(language);
  return (key: string, options?: Record<string, unknown>) => {
    let value = String(at(locale, key) ?? key);
    for (const [name, replacement] of Object.entries(options ?? {})) {
      value = value.replace("{{" + name + "}}", String(replacement));
    }
    return value;
  };
}

function notification(
  typeSlug: string,
  overrides: Partial<UserNotificationItem> = {},
): UserNotificationItem {
  return {
    id: "notification-1",
    typeSlug,
    category: null,
    title: "SESSION_REMINDER",
    body: "SESSION_REMINDER",
    createdAt: "2026-08-16T10:00:00.000Z",
    readAt: null,
    action: null,
    payload: {},
    ...overrides,
  };
}

describe("Practitioner notification presentation", () => {
  test("maps supported session events to human AR/EN copy", () => {
    const item = notification("sessions.session-join-available", {
      context: { patientName: "Mona Hassan" },
    });

    const en = resolvePractitionerNotificationPresentation(item, "en", translator("en"));
    const ar = resolvePractitionerNotificationPresentation(item, "ar", translator("ar"));

    expect(en).toEqual({
      title: "Session ready to join",
      body: "You can join your session with Mona Hassan now.",
    });
    expect(ar).toEqual({
      title: "جلستك جاهزة للدخول",
      body: "يمكنك الانضمام إلى جلستك مع Mona Hassan الآن.",
    });
  });

  test("never falls back to raw event/title/body strings", () => {
    const item = notification("unknown.backend-event");
    const presentation = resolvePractitionerNotificationPresentation(
      item,
      "en",
      translator("en"),
    );

    expect(presentation.title).toBe("New account update");
    expect(presentation.body).toBe(
      "There is a new update related to your Sawiyaa account.",
    );
    expect(JSON.stringify(presentation)).not.toContain("unknown.backend-event");
    expect(JSON.stringify(presentation)).not.toContain("SESSION_REMINDER");
  });

  test("prefers exact internal targets and safely falls back for unsupported routes", () => {
    expect(
      resolvePractitionerNotificationRoute(
        "/practitioner/messages/thread-123",
        "messages.session-message-received",
      ),
    ).toBe("/(practitioner)/messages/thread-123");
    expect(
      resolvePractitionerNotificationRoute(
        "/",
        "messages.support-message-received",
      ),
    ).toBe("/(practitioner)/messages?tab=support");
    expect(
      resolvePractitionerNotificationRoute("/https://unsafe.example", "sessions.session-reminder-15"),
    ).toBeNull();
  });

  test("groups only supported Practitioner event rows by event category", () => {
    const grouped = groupPractitionerNotificationPreferences([
      {
        typeSlug: "sessions.session-reminder-15",
        channel: "IN_APP",
        enabled: true,
      },
      {
        typeSlug: "sessions.session-reminder-15",
        channel: "EMAIL",
        enabled: false,
      },
      {
        typeSlug: "messages.session-message-received",
        channel: "PUSH",
        enabled: true,
      },
      {
        typeSlug: "payments.payment-succeeded",
        channel: "IN_APP",
        enabled: true,
      },
    ]);

    expect(grouped.get("sessions")?.[0].typeSlug).toBe(
      "sessions.session-reminder-15",
    );
    expect(grouped.get("sessions")?.[0].channels).toEqual([
      {
        typeSlug: "sessions.session-reminder-15",
        channel: "IN_APP",
        enabled: true,
      },
      {
        typeSlug: "sessions.session-reminder-15",
        channel: "EMAIL",
        enabled: false,
      },
    ]);
    expect(grouped.get("messages")?.[0].channels).toEqual([
      {
        typeSlug: "messages.session-message-received",
        channel: "PUSH",
        enabled: true,
      },
    ]);
    expect(grouped.has("bookings")).toBe(false);
    expect(grouped.has("schedule")).toBe(false);
  });

  test("uses canonical channel vocabulary in both locales", () => {
    for (const language of ["ar", "en"] as const) {
      const channels = readLocale(language).practitionerNotificationSettings.channels;
      expect(channels.PUSH).not.toBe("PUSH");
      expect(channels.IN_APP).not.toBe("IN_APP");
      expect(channels.EMAIL).not.toBe("EMAIL");
    }
  });
});
