import {
  getPatientNotificationCategory,
  getPatientNotificationEventLabelKey,
  groupPatientNotificationPreferences,
} from "../../src/features/patient/notifications/preferences";

describe("Patient notification preference presentation", () => {
  it("groups channels under one event without changing preference records", () => {
    const items = [
      { typeSlug: "sessions.session-reminder", channel: "IN_APP" as const, enabled: true },
      { typeSlug: "sessions.session-reminder", channel: "PUSH" as const, enabled: false },
      { typeSlug: "payments.payment-success", channel: "EMAIL" as const, enabled: true },
    ];

    const groups = groupPatientNotificationPreferences(items);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({
      typeSlug: "sessions.session-reminder",
      category: "sessions",
      channels: [items[0], items[1]],
    });
    expect(groups[1]?.channels).toEqual([items[2]]);
  });

  it("maps unknown backend events to a human fallback category and label", () => {
    expect(getPatientNotificationCategory("unknown.future-event")).toBe("general");
    expect(getPatientNotificationEventLabelKey("unknown.future-event")).toBe("generalUpdate");
  });
});
