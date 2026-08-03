import { normalizeIanaTimeZone } from "@/lib/time-formatting/time-formatting";
import { buildTimeZoneOptions } from "@/features/timezone/timezone-options";

/**
 * Compatibility exports for older practitioner feature imports. New UI must
 * render the role-agnostic TimeZonePicker directly.
 */
export function getLocalizedTimezoneOptions(
  locale: string,
): Array<{ value: string; label: string }> {
  return buildTimeZoneOptions({ locale: locale === "ar" ? "ar" : "en" }).map(
    ({ value, label }) => ({ value, label }),
  );
}

export function getLocalizedTimezoneLabel(
  value: string,
  locale: string,
): string | null {
  return (
    buildTimeZoneOptions({
      locale: locale === "ar" ? "ar" : "en",
      selectedTimeZone: value,
    }).find((option) => option.value === normalizeIanaTimeZone(value))?.label ??
    null
  );
}

export function isTimezoneSupported(value: string): boolean {
  return normalizeIanaTimeZone(value) !== null;
}
