import fs from "node:fs";
import path from "node:path";
import {
  resolvePatientNotificationPresentation,
} from "../src/features/patient/notifications/presentation";
import type { UserNotificationItem } from "../src/features/patient/notifications/types";

type JsonValue = Record<string, any>;
const root = path.resolve(__dirname, "..");

function locale(language: "ar" | "en") {
  return JSON.parse(
    fs.readFileSync(path.join(root, "src/i18n/locales", `${language}.json`), "utf8"),
  ) as JsonValue;
}

function translator(language: "ar" | "en") {
  const values = locale(language);
  return (key: string, options?: Record<string, unknown>) => {
    const resolved: unknown = key
      .split(".")
      .reduce((current, part) => current?.[part], values);
    let value = String(resolved ?? key);
    for (const [name, replacement] of Object.entries(options ?? {})) {
      value = value.replaceAll(`{{${name}}}`, String(replacement));
    }
    return value;
  };
}

function notification(typeSlug: string, overrides: Partial<UserNotificationItem> = {}) {
  return {
    id: "notification-1",
    typeSlug,
    category: null,
    title: "SESSION_READY",
    body: "SESSION_READY",
    createdAt: "2026-08-16T10:00:00.000Z",
    readAt: null,
    action: null,
    payload: {},
    ...overrides,
  } satisfies UserNotificationItem;
}

describe("Patient notification presentation", () => {
  it("maps session reminders to human AR/EN copy without exposing event enums", () => {
    const item = notification("sessions.session-reminder", {
      context: { practitionerName: "Mona Hassan" },
    });

    const en = resolvePatientNotificationPresentation(item, "en", translator("en"));
    const ar = resolvePatientNotificationPresentation(item, "ar", translator("ar"));

    expect(en).toEqual({
      title: "Your session starts soon",
      body: "Your session with Mona Hassan starts soon.",
    });
    expect(ar).toEqual({
      title: "جلستك تبدأ قريبًا",
      body: "جلستك مع Mona Hassan تبدأ قريبًا.",
    });
    expect(JSON.stringify({ en, ar })).not.toContain("SESSION_READY");
  });

  it("uses human payment and message vocabulary for supported events", () => {
    const payment = resolvePatientNotificationPresentation(
      notification("payments.payment-success"),
      "en",
      translator("en"),
    );
    const message = resolvePatientNotificationPresentation(
      notification("messages.session-message-received"),
      "ar",
      translator("ar"),
    );

    expect(payment.title).toBe("Payment confirmed");
    expect(message).toEqual({
      title: "لديك رسالة جديدة",
      body: "أرسل المختص رسالة جديدة.",
    });
  });

  it("never falls back to raw unknown type, title, or body", () => {
    const presentation = resolvePatientNotificationPresentation(
      notification("unknown.backend-event"),
      "en",
      translator("en"),
    );

    expect(presentation).toEqual({
      title: "New update",
      body: "There is a new update for your Sawiyaa account.",
    });
    expect(JSON.stringify(presentation)).not.toContain("unknown.backend-event");
    expect(JSON.stringify(presentation)).not.toContain("SESSION_READY");
  });
});
