import { normalizeIanaTimeZone } from "@/lib/time-formatting";

export function detectBrowserIanaTimeZone(): string | null {
  if (typeof Intl === "undefined") return null;

  try {
    return normalizeIanaTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  } catch {
    return null;
  }
}

export function isMissingPersistedTimeZone(
  timezone: string | null | undefined,
): boolean {
  return timezone == null || timezone.trim().length === 0;
}
