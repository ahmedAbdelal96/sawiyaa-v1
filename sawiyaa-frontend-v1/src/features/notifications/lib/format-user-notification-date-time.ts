import { formatEffectiveViewerDateTime } from "@/lib/time-formatting";

export function formatUserNotificationDateTime(
  value: string,
  locale: string,
  timeZone?: string | null,
): string {
  return formatEffectiveViewerDateTime(value, timeZone, { locale, fallbackText: value });
}
