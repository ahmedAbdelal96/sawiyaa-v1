export type AnalyticsEventName =
  | "discovery_opened"
  | "practitioner_profile_viewed"
  | "booking_started"
  | "slot_selected"
  | "booking_confirmed"
  | "payment_initiated"
  | "payment_succeeded"
  | "payment_failed"
  | "session_joined"
  | "practitioner_availability_updated";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

type AnalyticsSink = (payload: {
  name: AnalyticsEventName;
  properties: AnalyticsProperties;
  timestamp: string;
}) => void;

declare global {
  // Optional escape hatch for future wiring without adding a new analytics system.
  // eslint-disable-next-line no-var
  var __fayedAnalyticsTrackEvent__: AnalyticsSink | undefined;
}

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  properties: AnalyticsProperties = {},
) {
  const payload = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  try {
    if (typeof globalThis.__fayedAnalyticsTrackEvent__ === "function") {
      globalThis.__fayedAnalyticsTrackEvent__(payload);
      return;
    }

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.info("[analytics]", payload);
    }
  } catch {
    // Never let analytics instrumentation break the product flow.
  }
}
