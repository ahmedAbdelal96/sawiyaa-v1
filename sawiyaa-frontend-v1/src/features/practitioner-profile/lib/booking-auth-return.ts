export function buildPractitionerBookingAuthReturnPath(
  slug: string,
  duration: 30 | 60,
): string {
  return `/patient/practitioners/${encodeURIComponent(slug)}?intent=book&duration=${duration}`;
}

export function parsePractitionerBookingIntent(
  intent: string | null,
  duration: string | null,
): 30 | 60 | null {
  if (intent !== "book") return null;
  if (duration === "30") return 30;
  if (duration === "60") return 60;
  return null;
}
