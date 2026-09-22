export function buildPractitionerBookingAuthReturnPath(
  slug: string,
  duration: 30 | 60,
): string {
  return `/patient/practitioners/${encodeURIComponent(slug)}?intent=book&duration=${duration}`;
}
