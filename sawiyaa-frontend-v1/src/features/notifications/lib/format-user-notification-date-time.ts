import { formatViewerDateTime } from "@/lib/time-formatting";

export function formatUserNotificationDateTime(
  value: string,
  locale: string,
): string {
  return formatViewerDateTime(value, { locale, fallbackText: value });
}
